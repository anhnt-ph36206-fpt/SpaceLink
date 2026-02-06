<?php

namespace App\Http\Controllers;

use OpenApi\Attributes as OA;

#[OA\Info(
    title: "SpaceLink A",
    version: "1.0.0",
    description: "Hệ thống API backend viết bằng Laravel 12"
)]
#[OA\Server(
    url: "http://localhost:8000",
    description: "Local Server"
)]
abstract class Controller
{
    //
}   
