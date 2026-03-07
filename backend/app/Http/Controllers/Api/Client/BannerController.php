<?php
namespace App\Http\Controllers\Api\Client;

use App\Http\Controllers\Controller;
use App\Models\Banner;
use Illuminate\Http\JsonResponse;
use OpenApi\Attributes as OA;

class BannerController extends Controller
{
    #[OA\Get(
        path: '/api/client/banners',
        summary: 'Danh sách banner trang chủ (Client)',
        tags: ['Client - Banners'],
        responses: [
            new OA\Response(response: 200, description: 'Danh sách banner')
        ]
    )]
    public function index(): JsonResponse
    {
        $banners = Banner::visible()->get();

        return response()->json([
            'status' => true,
            'data'   => $banners
        ]);
    }
}
