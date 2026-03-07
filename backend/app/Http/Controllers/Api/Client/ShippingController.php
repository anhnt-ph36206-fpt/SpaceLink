<?php
namespace App\Http\Controllers\Api\Client;

use App\Http\Controllers\Controller;
use App\Models\Shipping;
use Illuminate\Http\JsonResponse;
use OpenApi\Attributes as OA;

class ShippingController extends Controller
{
    #[OA\Get(
        path: '/api/client/shippings',
        summary: 'Danh sách đơn vị vận chuyển (Client)',
        tags: ['Client - Shippings'],
        security: [['sanctum' => []]],
        responses: [
            new OA\Response(response: 200, description: 'Danh sách VC')
        ]
    )]
    public function index(): JsonResponse
    {
        $shippings = Shipping::active()->get();

        return response()->json([
            'status' => true,
            'data'   => $shippings
        ]);
    }
}
