using Microsoft.AspNetCore.Mvc;
using TorneoApi.Extensions;
using TorneoApi.Models;

namespace TorneoApi.Controllers;

[ApiController]
[Produces("application/json")]
public abstract class ApiControllerBase : ControllerBase
{
    protected int CurrentUserId => User.GetUserId();

    protected bool CanManage(Tournament tournament) =>
        User.IsAdmin() || tournament.OrganizerId == CurrentUserId;

    protected bool CanManage(Team team) =>
        User.IsAdmin() || team.OwnerId == CurrentUserId;

    protected ObjectResult Fail(int statusCode, string detail) =>
        Problem(detail: detail, statusCode: statusCode);

    protected ObjectResult BadRule(string detail) => Fail(StatusCodes.Status400BadRequest, detail);

    protected ObjectResult Forbidden(string detail = "No tiene permisos para realizar esta acción.") =>
        Fail(StatusCodes.Status403Forbidden, detail);

    protected ObjectResult NotFoundProblem(string detail) => Fail(StatusCodes.Status404NotFound, detail);

    protected ObjectResult ConflictProblem(string detail) => Fail(StatusCodes.Status409Conflict, detail);
}
