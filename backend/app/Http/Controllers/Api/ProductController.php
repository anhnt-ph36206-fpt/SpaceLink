<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

class ProductController extends Controller
{
    #[OA\Get(
        path: '/api/products',
        summary: 'Lấy danh sách sản phẩm',
        tags: ['Products'],
        parameters: [
            new OA\Parameter(
                name: 'category_id',
                in: 'query',
                description: 'Lọc theo ID danh mục',
                required: false,
                schema: new OA\Schema(type: 'integer')
            ),
            new OA\Parameter(
                name: 'min_price',
                in: 'query',
                description: 'Lọc sản phẩm có giá từ mức này trở lên',
                required: false,
                schema: new OA\Schema(type: 'number')
            ),
             new OA\Parameter(
                name: 'page',
                in: 'query',
                description: 'Số trang (phân trang)',
                required: false,
                schema: new OA\Schema(type: 'integer')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Danh sách sản phẩm thành công',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'status', type: 'string', example: 'success'),
                        new OA\Property(property: 'data', type: 'object',
                            properties: [
                                new OA\Property(property: 'current_page', type: 'integer'),
                                new OA\Property(property: 'data', type: 'array', items: new OA\Items(type: 'object')),
                                new OA\Property(property: 'total', type: 'integer'),
                            ]
                        )
                    ]
                )
            )
        ]
    )]
    public function index(Request $request)
    {
        $query = Product::with(['category', 'brand'])
            ->where('is_active', true);

        // Lọc theo danh mục
        if ($request->has('category_id')) {
            $query->where('category_id', $request->category_id);
        }

        // Lọc theo khoảng giá
        if ($request->has('min_price')) {
            $query->where('price', '>=', $request->min_price);
        }

        $products = $query->latest()->paginate(10);

        return response()->json([
            'status' => 'success',
            'data' => $products
        ]);
    }

    #[OA\Get(
        path: '/api/products/{id}',
        summary: 'Xem chi tiết sản phẩm',
        tags: ['Products'],
        parameters: [
            new OA\Parameter(
                name: 'id',
                in: 'path',
                description: 'ID của sản phẩm',
                required: true,
                schema: new OA\Schema(type: 'integer')
            )
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Chi tiết sản phẩm',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'status', type: 'string', example: 'success'),
                        new OA\Property(property: 'data', type: 'object')
                    ]
                )
            ),
            new OA\Response(
                response: 404,
                description: 'Không tìm thấy sản phẩm'
            )
        ]
    )]
    public function show($id)
    {
        // Eager Loading sâu để lấy: Variants -> Attributes -> Group
        $product = Product::with([
            'category', 
            'brand', 
            'images', 
            'variants.attributes.group' // Lấy ra biến thể kèm thuộc tính (Màu gì, Size gì)
        ])->find($id);

        if (!$product) {
            return response()->json(['message' => 'Không tìm thấy sản phẩm'], 404);
        }

        // Tăng lượt xem
        $product->increment('view_count');

        return response()->json([
            'status' => 'success',
            'data' => $product
        ]);
    }
}