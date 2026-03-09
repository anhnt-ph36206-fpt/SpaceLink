<?php
namespace App\Http\Controllers\Api\Client;

use App\Http\Controllers\Controller;
use App\Models\Shipping;
use Illuminate\Http\JsonResponse;
class ShippingController extends Controller
{
    public function index(): JsonResponse
    {
        $shippings = Shipping::active()->get();

        return response()->json([
            'status' => true,
            'data'   => $shippings
        ]);
    }
}
