using System.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using Volunteer.Models;

namespace Volunteer.Controllers;

public class HomeController : Controller
{
    public IActionResult Index([FromServices] IWebHostEnvironment environment)
    {
        if (environment.IsDevelopment())
        {
            return Redirect("/swagger");
        }

        return View();
    }

    public IActionResult Privacy()
    {
        return View();
    }

    [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
    public IActionResult Error()
    {
        return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
    }
}
