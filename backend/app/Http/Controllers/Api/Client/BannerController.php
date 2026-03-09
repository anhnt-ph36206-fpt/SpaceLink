<?php
namespace App\Http\Controllers\Api\Client;

use App\Http\Controllers\Controller;
use App\Models\Banner;
use Illuminate\Http\JsonResponse;
class BannerController extends Controller
{
    public function index(): JsonResponse
    {
        $banners = Banner::visible()->get();

        return response()->json([
            'status' => true,
            'data'   => $banners
        ]);
    }
}
