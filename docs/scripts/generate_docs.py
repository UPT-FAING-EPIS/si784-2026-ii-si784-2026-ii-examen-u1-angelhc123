#!/usr/bin/env python3
"""
Genera la documentación técnica del proyecto en formato Markdown + Mermaid:

  - Diccionario de datos      (desde el esquema real de la base de datos)
  - Diagrama entidad-relación (desde el esquema real de la base de datos)
  - Diagrama de clases        (desde el código C# del backend)
  - Diagrama de componentes   (desde controladores, servicios y páginas React)
  - Diagrama de despliegue    (desde Dockerfiles y workflows)

Uso:
  python docs/scripts/generate_docs.py --db postgresql://user:pass@host:5432/db
  python docs/scripts/generate_docs.py --db backend/TorneoApi/torneo.db      (SQLite)
"""
from __future__ import annotations

import argparse
import datetime as dt
import re
import sqlite3
from dataclasses import dataclass, field
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BACKEND = ROOT / "backend" / "TorneoApi"
FRONTEND = ROOT / "frontend" / "src"
OUT = ROOT / "docs"
DIAGRAMS = OUT / "diagrams"

GENERATED_NOTE = "> Documento generado automáticamente por `generate-documentation.yml` — no editar a mano."


# =====================================================================
# Modelo del esquema de base de datos
# =====================================================================
@dataclass
class Column:
    name: str
    type: str
    nullable: bool
    default: str | None = None
    pk: bool = False
    fk: str | None = None  # "tabla.columna"
    unique: bool = False
    comment: str = ""


@dataclass
class Table:
    name: str
    comment: str = ""
    columns: list[Column] = field(default_factory=list)
    indexes: list[str] = field(default_factory=list)


def read_postgres(url: str) -> list[Table]:
    import psycopg  # pylint: disable=import-outside-toplevel

    with psycopg.connect(url) as conn, conn.cursor() as cur:
        cur.execute(
            """
            SELECT c.relname, COALESCE(obj_description(c.oid, 'pg_class'), '')
            FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname = 'public' AND c.relkind = 'r'
            ORDER BY c.relname
            """
        )
        tables = {name: Table(name, comment) for name, comment in cur.fetchall()}

        cur.execute(
            """
            SELECT c.table_name, c.column_name,
                   CASE WHEN c.character_maximum_length IS NOT NULL
                        THEN c.data_type || '(' || c.character_maximum_length || ')'
                        ELSE c.data_type END,
                   c.is_nullable = 'YES', c.column_default,
                   COALESCE(col_description(format('%I.%I', c.table_schema, c.table_name)::regclass, c.ordinal_position), '')
            FROM information_schema.columns c
            WHERE c.table_schema = 'public'
            ORDER BY c.table_name, c.ordinal_position
            """
        )
        for tname, cname, ctype, nullable, default, comment in cur.fetchall():
            if tname in tables:
                tables[tname].columns.append(Column(cname, ctype, nullable, default, comment=comment))

        cur.execute(
            """
            SELECT tc.table_name, kcu.column_name, tc.constraint_type,
                   ccu.table_name, ccu.column_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu
              ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
            LEFT JOIN information_schema.constraint_column_usage ccu
              ON tc.constraint_name = ccu.constraint_name AND tc.constraint_type = 'FOREIGN KEY'
            WHERE tc.table_schema = 'public' AND tc.constraint_type IN ('PRIMARY KEY', 'FOREIGN KEY')
            """
        )
        for tname, cname, ctype, ftable, fcol in cur.fetchall():
            col = _find(tables, tname, cname)
            if col is None:
                continue
            if ctype == "PRIMARY KEY":
                col.pk = True
            else:
                col.fk = f"{ftable}.{fcol}"

        cur.execute(
            "SELECT tablename, indexname, indexdef FROM pg_indexes WHERE schemaname = 'public' ORDER BY tablename, indexname"
        )
        for tname, iname, idef in cur.fetchall():
            if tname not in tables:
                continue
            tables[tname].indexes.append(f"`{iname}`: {idef.split(' USING ')[-1]}" if " USING " in idef else iname)
            if "UNIQUE" in idef and not iname.startswith("PK_"):
                cols = re.search(r"\((.+)\)", idef)
                if cols and "," not in cols.group(1):
                    col = _find(tables, tname, cols.group(1).strip('" '))
                    if col:
                        col.unique = True

    return [t for t in tables.values() if not t.name.startswith("__")]


def read_sqlite(path: str) -> list[Table]:
    conn = sqlite3.connect(path)
    cur = conn.cursor()
    names = [r[0] for r in cur.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '\\_\\_%' ESCAPE '\\' ORDER BY name")]
    tables = []
    for name in names:
        t = Table(name)
        for _, cname, ctype, notnull, default, pk in cur.execute("SELECT cid, name, type, \"notnull\", dflt_value, pk FROM pragma_table_info(?)", (name,)):
            t.columns.append(Column(cname, ctype or "ANY", not notnull, default, pk=bool(pk)))
        for row in cur.execute("SELECT * FROM pragma_foreign_key_list(?)", (name,)):
            col = next((c for c in t.columns if c.name == row[3]), None)
            if col:
                col.fk = f"{row[2]}.{row[4]}"
        for idx in cur.execute("SELECT * FROM pragma_index_list(?)", (name,)).fetchall():
            iname, unique = idx[1], idx[2]
            icols = [r[2] for r in cur.execute("SELECT * FROM pragma_index_info(?)", (iname,))]
            t.indexes.append(f"`{iname}`: ({', '.join(icols)}){' UNIQUE' if unique else ''}")
            if unique and len(icols) == 1:
                col = next((c for c in t.columns if c.name == icols[0]), None)
                if col:
                    col.unique = True
        tables.append(t)
    conn.close()
    return tables


def _find(tables: dict[str, Table], tname: str, cname: str) -> Column | None:
    table = tables.get(tname)
    return next((c for c in table.columns if c.name == cname), None) if table else None


# =====================================================================
# Diccionario de datos y diagrama ER
# =====================================================================
def data_dictionary(tables: list[Table], engine: str) -> str:
    lines = [
        "# Diccionario de datos",
        "",
        GENERATED_NOTE,
        "",
        f"- **Motor:** {engine}",
        f"- **Tablas:** {len(tables)}",
        f"- **Generado:** {dt.datetime.now(dt.timezone.utc):%Y-%m-%d %H:%M} UTC",
        "",
        "## Índice",
        "",
    ]
    lines += [f"- [{t.name}](#{t.name}){' — ' + t.comment if t.comment else ''}" for t in tables]
    for t in tables:
        lines += ["", f"## {t.name}", ""]
        if t.comment:
            lines += [t.comment, ""]
        lines += [
            "| # | Columna | Tipo | Nulo | Clave | Por defecto | Descripción |",
            "|---|---------|------|------|-------|-------------|-------------|",
        ]
        for i, c in enumerate(t.columns, 1):
            keys = []
            if c.pk:
                keys.append("PK")
            if c.fk:
                keys.append(f"FK → `{c.fk}`")
            if c.unique and not c.pk:
                keys.append("UQ")
            default = f"`{c.default}`" if c.default else ""
            lines.append(
                f"| {i} | `{c.name}` | {c.type} | {'Sí' if c.nullable else 'No'} | {', '.join(keys)} | {default} | {c.comment} |"
            )
        if t.indexes:
            lines += ["", "**Índices:**", ""] + [f"- {i}" for i in t.indexes]
    return "\n".join(lines) + "\n"


def _mermaid_type(sql_type: str) -> str:
    t = sql_type.lower()
    if "char" in t or "text" in t:
        return "string"
    if "timestamp" in t or "date" in t:
        return "datetime"
    if "int" in t:
        return "int"
    if "bool" in t:
        return "bool"
    if "numeric" in t or "double" in t or "real" in t:
        return "decimal"
    return re.sub(r"[^a-z]", "", t) or "any"


def er_diagram(tables: list[Table]) -> str:
    lines = ["erDiagram"]
    by_name = {t.name: t for t in tables}
    for t in tables:
        for c in t.columns:
            if not c.fk:
                continue
            target = c.fk.split(".")[0]
            if target not in by_name:
                continue
            left = "|o" if c.nullable else "||"
            lines.append(f'    {target} {left}--o{{ {t.name} : "{c.name}"')
    for t in tables:
        lines.append(f"    {t.name} {{")
        for c in t.columns:
            keys = ",".join(k for k, ok in (("PK", c.pk), ("FK", bool(c.fk)), ("UK", c.unique and not c.pk)) if ok)
            comment = f' "{c.comment.replace(chr(34), "")}"' if c.comment else ""
            lines.append(f"        {_mermaid_type(c.type)} {c.name}{' ' + keys if keys else ''}{comment}")
        lines.append("    }")
    return "\n".join(lines)


# =====================================================================
# Diagrama de clases (parser C# ligero)
# =====================================================================
TYPE_RE = re.compile(
    r"^\s*public\s+(?:static\s+|abstract\s+|sealed\s+|partial\s+)*(class|record|interface|enum)\s+(\w+)"
    r"(?:\s*\(([^)]*)\))?(?:\s*:\s*([\w<>,\s.]+?))?\s*(?:\{|$|;|where)",
    re.M,
)
PROP_RE = re.compile(r"^\s*public\s+(?!class|record|interface|enum|static)([\w<>\[\]?,. ]+?)\s+(\w+)\s*\{\s*get;", re.M)
METHOD_RE = re.compile(
    r"^\s*(public|protected)\s+(?:static\s+|async\s+|virtual\s+|override\s+)*([\w<>\[\]?,.() ]+?)\s+(\w+)\s*\(([^)]*)\)", re.M
)


@dataclass
class CsType:
    kind: str
    name: str
    folder: str
    bases: list[str] = field(default_factory=list)
    props: list[tuple[str, str]] = field(default_factory=list)
    methods: list[str] = field(default_factory=list)
    ctor_deps: list[str] = field(default_factory=list)
    enum_values: list[str] = field(default_factory=list)


def _split_params(params: str) -> list[tuple[str, str]]:
    out, depth, cur = [], 0, ""
    for ch in params:
        depth += ch == "<"
        depth -= ch == ">"
        if ch == "," and depth == 0:
            out.append(cur)
            cur = ""
        else:
            cur += ch
    if cur.strip():
        out.append(cur)
    result = []
    for p in out:
        p = re.sub(r"\[[^\]]*\]", "", p).split("=")[0].strip()
        parts = p.rsplit(" ", 1)
        if len(parts) == 2:
            result.append((parts[0].strip(), parts[1].strip()))
    return result


def _mm(type_name: str) -> str:
    """Convierte un tipo C# a sintaxis Mermaid (genéricos con ~), quitando envoltorios Task/ActionResult."""
    t = type_name.replace(" ", "")
    while True:
        unwrapped = re.sub(r"^(Task|ActionResult)<(.+)>$", r"\2", t)
        if unwrapped == t:
            break
        t = unwrapped
    t = {"Task": "void"}.get(t, t)
    return t.replace("<", "~").replace(">", "~")


def parse_csharp(folders: list[str]) -> dict[str, CsType]:
    types: dict[str, CsType] = {}
    for folder in folders:
        for f in sorted((BACKEND / folder).glob("*.cs")):
            src = f.read_text(encoding="utf-8")
            src = re.sub(r"//.*", "", src)
            matches = list(TYPE_RE.finditer(src))
            for i, m in enumerate(matches):
                kind, name, ctor, bases = m.group(1), m.group(2), m.group(3), m.group(4)
                body = src[m.end(): matches[i + 1].start() if i + 1 < len(matches) else len(src)]
                t = CsType(kind, name, folder)
                if bases:
                    t.bases = [b.split("(")[0].strip() for b in re.split(r",(?![^<]*>)", bases) if b.strip()]
                if kind == "enum":
                    block = body.split("}")[0]
                    t.enum_values = [v.split("=")[0].strip() for v in block.replace("{", "").split(",") if v.strip()]
                elif kind == "record" and ctor:
                    t.props = _split_params(ctor)
                else:
                    if ctor:
                        t.ctor_deps = [p[0] for p in _split_params(ctor)]
                    body = re.split(r"\n\s*private\s+(?:sealed\s+)?class\s", body)[0]
                    t.props = [(pt.strip(), pn) for pt, pn in PROP_RE.findall(body)]
                    for vis, ret, mname, params in METHOD_RE.findall(body):
                        if mname == name or ret.strip() in ("class", "record", "new"):
                            continue
                        sign = "+" if vis == "public" else "#"
                        args = ", ".join(p[1] for p in _split_params(params))
                        t.methods.append(f"{sign}{mname}({args}) {_mm(ret.strip())}")
                types[name] = t
    return types


def class_diagram(types: dict[str, CsType], include: set[str], max_methods: int = 12) -> str:
    lines = ["classDiagram", "    direction LR"]
    names = {n for n, t in types.items() if t.folder in include}
    for n in sorted(names):
        t = types[n]
        lines.append(f"    class {n} {{")
        if t.kind == "enum":
            lines.append("        <<enumeration>>")
            lines += [f"        {v}" for v in t.enum_values]
        elif t.kind == "interface":
            lines.append("        <<interface>>")
        elif t.kind == "record":
            lines.append("        <<record>>")
        for pt, pn in t.props:
            lines.append(f"        +{_mm(pt)} {pn}")
        for meth in t.methods[:max_methods]:
            lines.append(f"        {meth}")
        if len(t.methods) > max_methods:
            lines.append(f"        +...{len(t.methods) - max_methods} más()")
        lines.append("    }")

    relations: list[str] = []
    seen = set()
    for n in sorted(names):
        t = types[n]
        for b in t.bases:
            base = b.split("<")[0]
            if base in names:
                rel = "..|>" if types[base].kind == "interface" else "--|>"
                relations.append(f"    {n} {rel} {base}")
        for pt, pn in t.props:
            inner = re.sub(r"^(ICollection|IEnumerable|IReadOnlyList|List)<(.+)>$", r"\2", pt.rstrip("?"))
            many = inner != pt.rstrip("?")
            if inner in names and inner != n and types[inner].kind != "enum":
                key = tuple(sorted((n, inner))) + (pn,)
                if key in seen:
                    continue
                seen.add(key)
                arrow = '"1" --> "*"' if many else '--> "1"'
                relations.append(f"    {n} {arrow} {inner} : {pn}")
            elif inner in names and types[inner].kind == "enum":
                relations.append(f"    {n} ..> {inner}")
        for dep in t.ctor_deps:
            dep_name = dep.split("<")[0]
            if dep_name in names:
                relations.append(f"    {n} ..> {dep_name} : usa")
    return "\n".join(lines + list(dict.fromkeys(relations)))


# =====================================================================
# Diagrama de componentes
# =====================================================================
def component_diagram(types: dict[str, CsType]) -> str:
    controllers = []
    sources: dict[str, str] = {}
    for f in sorted((BACKEND / "Controllers").glob("*Controller.cs")):
        src = f.read_text(encoding="utf-8")
        route = re.search(r'\[Route\("([^"]+)"\)\]', src)
        endpoints = len(re.findall(r"\[Http(Get|Post|Put|Patch|Delete)", src))
        deps = re.search(r"class \w+\(([^)]*)\)", src)
        controllers.append((f.stem, route.group(1) if route else "", endpoints, deps.group(1) if deps else ""))
        sources[f.stem] = src

    pages = sorted(p.stem for p in (FRONTEND / "pages").rglob("*.jsx"))
    components = sorted(p.stem for p in (FRONTEND / "components").glob("*.jsx"))
    services = sorted(n for n, t in types.items() if t.folder == "Services" and t.kind in ("class", "interface"))

    lines = [
        "flowchart LR",
        "    user([Usuario / Navegador])",
        "    subgraph FE[Frontend - React SPA]",
        "        direction TB",
        "        router[React Router - App.jsx]",
        "        auth[AuthContext - sesión JWT]",
        f"        pages[Páginas: {', '.join(pages)}]",
        f"        comps[Componentes UI: {', '.join(components)}]",
        "        apiclient[api/client.js + api/services.js]",
        "        router --> pages --> comps",
        "        pages --> auth",
        "        pages --> apiclient",
        "    end",
        "    subgraph BE[Backend - ASP.NET Core Web API]",
        "        direction TB",
        "        mw[Middleware: CORS, JWT Bearer, ProblemDetails]",
    ]
    for name, route, eps, _ in controllers:
        lines.append(f'        {name}["{name}<br/>/{route} · {eps} endpoints"]')
    lines.append("        subgraph SV[Servicios de dominio]")
    lines += [f"            {s}[{s}]" for s in services]
    lines += [
        "        end",
        "        db[(AppDbContext - EF Core)]",
    ]
    for name, _, _, deps in controllers:
        lines.append(f"        mw --> {name}")
        lines.append(f"        {name} --> db")
        for s in services:
            if re.search(rf"\b{s}\b", deps) or re.search(rf"\b{s}\.", sources[name]):
                lines.append(f"        {name} --> {s}")
    lines += [
        "    end",
        "    pg[(PostgreSQL)]",
        "    user -->|HTTPS| router",
        "    apiclient -->|REST JSON + Bearer JWT| mw",
        "    db -->|Npgsql| pg",
    ]
    return "\n".join(lines)


# =====================================================================
# Diagrama de despliegue
# =====================================================================
def _docker_info(path: Path) -> tuple[list[str], str]:
    if not path.exists():
        return [], ""
    src = path.read_text(encoding="utf-8")
    images = re.findall(r"^FROM\s+(\S+)", src, re.M)
    port = re.search(r"^EXPOSE\s+(\d+)", src, re.M)
    return images, port.group(1) if port else ""


def deployment_diagram() -> str:
    be_imgs, be_port = _docker_info(ROOT / "backend" / "Dockerfile")
    fe_imgs, fe_port = _docker_info(ROOT / "frontend" / "Dockerfile")
    workflows = sorted(p.name for p in (ROOT / ".github" / "workflows").glob("*.yml"))

    return "\n".join([
        "flowchart TB",
        "    dev([Desarrollador - VS Code])",
        "    subgraph GH[GitHub]",
        "        repo[(Repositorio)]",
        f"        actions[GitHub Actions<br/>{'<br/>'.join(workflows)}]",
        "    end",
        "    subgraph RW[Railway - proyecto / entorno production]",
        "        direction LR",
        f'        fe["Servicio frontend<br/>Contenedor {fe_imgs[-1] if fe_imgs else "nginx"}<br/>React SPA estática · puerto {fe_port}"]',
        f'        be["Servicio backend<br/>Contenedor {be_imgs[-1] if be_imgs else "aspnet"}<br/>TorneoApi.dll · puerto {be_port}"]',
        '        pg[("PostgreSQL<br/>postgres-ssl · volumen persistente")]',
        "    end",
        "    tf[Terraform<br/>provider railway]",
        "    browser([Usuario - Navegador])",
        "    dev -->|git push| repo --> actions",
        "    actions -->|deploy.yml · railway up| fe",
        "    actions -->|deploy.yml · railway up| be",
        "    actions -->|infra.yml| tf -->|aprovisiona| RW",
        "    browser -->|HTTPS *.up.railway.app| fe",
        "    browser -->|HTTPS REST + JWT| be",
        "    be -->|red privada *.railway.internal:5432| pg",
    ])


# =====================================================================
# Escritura de archivos
# =====================================================================
def write_mermaid(name: str, title: str, description: str, mermaid: str) -> None:
    DIAGRAMS.mkdir(parents=True, exist_ok=True)
    (DIAGRAMS / f"{name}.mmd").write_text(mermaid + "\n", encoding="utf-8")
    (OUT / f"{name}.md").write_text(
        f"# {title}\n\n{GENERATED_NOTE}\n\n{description}\n\n```mermaid\n{mermaid}\n```\n", encoding="utf-8"
    )


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--db", required=True, help="URL postgresql://... o ruta a archivo SQLite")
    args = parser.parse_args()

    if args.db.startswith("postgres"):
        tables, engine = read_postgres(args.db), "PostgreSQL"
    else:
        tables, engine = read_sqlite(args.db), "SQLite"
    if not tables:
        raise SystemExit("No se encontraron tablas: ¿se creó el esquema?")

    OUT.mkdir(exist_ok=True)
    (OUT / "data-dictionary.md").write_text(data_dictionary(tables, engine), encoding="utf-8")

    write_mermaid("er-diagram", "Diagrama entidad-relación",
                  f"Generado desde el esquema real de {engine}.", er_diagram(tables))

    types = parse_csharp(["Models", "Dtos", "Services", "Data", "Controllers"])
    write_mermaid("class-diagram", "Diagrama de clases — Dominio",
                  "Entidades del dominio (`backend/TorneoApi/Models`).",
                  class_diagram(types, {"Models"}))
    write_mermaid("class-diagram-application", "Diagrama de clases — Aplicación",
                  "Controladores, servicios y contexto de datos.",
                  class_diagram(types, {"Controllers", "Services", "Data"}, max_methods=14))
    write_mermaid("component-diagram", "Diagrama de componentes",
                  "Componentes del frontend React, la API ASP.NET Core y la base de datos.",
                  component_diagram(types))
    write_mermaid("deployment-diagram", "Diagrama de despliegue",
                  "Infraestructura en Railway aprovisionada con Terraform y desplegada con GitHub Actions.",
                  deployment_diagram())

    (OUT / "README.md").write_text("\n".join([
        "# Documentación técnica",
        "",
        GENERATED_NOTE,
        "",
        "| Documento | Contenido |",
        "|-----------|-----------|",
        "| [Diccionario de datos](data-dictionary.md) | Tablas, columnas, tipos, claves e índices |",
        "| [Diagrama entidad-relación](er-diagram.md) | Modelo relacional de la base de datos |",
        "| [Diagrama de clases — Dominio](class-diagram.md) | Entidades y enumeraciones |",
        "| [Diagrama de clases — Aplicación](class-diagram-application.md) | Controladores, servicios y DbContext |",
        "| [Diagrama de componentes](component-diagram.md) | Frontend, API y base de datos |",
        "| [Diagrama de despliegue](deployment-diagram.md) | GitHub Actions, Railway y Terraform |",
        "",
        "Los archivos `.mmd` de `diagrams/` contienen el código Mermaid puro.",
        "",
    ]), encoding="utf-8")
    print(f"Documentación generada en {OUT} ({len(tables)} tablas, {len(types)} tipos C#).")


if __name__ == "__main__":
    main()
