<?php

namespace App\Http\Controllers\Api\Client;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Http\Resources\ProductResource;
use App\Http\Resources\ProductCollection;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

class ProductController extends Controller
{
    #[OA\Get(
        path: '/api/products',
        summary: 'Lấy danh sách sản phẩm',
        tags: ['Client - Products'],
        parameters: [
            new OA\Parameter(
                name: 'category_id',
                in: 'query',
                description: 'Lọc theo ID danh mục',
                required: false,
                schema: new OA\Schema(type: 'integer')
            ),
            new OA\Parameter(
                name: 'keyword',
                in: 'query',
                description: 'Tìm kiếm theo tên sản phẩm',
                required: false,
                schema: new OA\Schema(type: 'string')
            ),
            new OA\Parameter(
                name: 'min_price',
                in: 'query',
                description: 'Lọc sản phẩm có giá từ mức này trở lên',
                required: false,
                schema: new OA\Schema(type: 'number')
            ),
             new OA\Parameter(
                name: 'max_price',
                in: 'query',
                description: 'Lọc sản phẩm có giá đến mức này',
                required: false,
                schema: new OA\Schema(type: 'number')
            ),
            new OA\Parameter(
                name: 'sort_by',
                in: 'query',
                description: 'Sắp xếp theo: price_asc, price_desc, latest, oldest, view_count',
                required: false,
                schema: new OA\Schema(type: 'string')
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
                        new OA\Property(property: 'data', type: 'array', items: new OA\Items(type: 'object')),
                        new OA\Property(property: 'links', type: 'object'),
                        new OA\Property(property: 'meta', type: 'object'),
                    ]
                )
            )
        ]
    )]
    public function index(Request $request)
    {
        $query = Product::with(['category', 'brand', 'images'])
            ->where('is_active', true);

        // Lọc theo danh mục
        if ($request->filled('category_id')) {
            $query->where('category_id', $request->category_id);
        }

        // Lọc theo thương hiệu
        if ($request->filled('brand_id')) {
            $query->where('brand_id', $request->brand_id);
        }

        // Tìm kiếm theo tên
        if ($request->filled('keyword')) {
            $keyword = $request->keyword;
            $query->where('name', 'like', "%{$keyword}%");
        }

        // Lọc theo khoảng giá (dùng giá hiệu lực = COALESCE(sale_price, price))
        if ($request->filled('min_price')) {
            $query->where(function ($q) use ($request) {
                $q->whereRaw('COALESCE(sale_price, price) >= ?', [$request->min_price]);
            });
        }
        if ($request->filled('max_price')) {
            $query->where(function ($q) use ($request) {
                $q->whereRaw('COALESCE(sale_price, price) <= ?', [$request->max_price]);
            });
        }

        // Sắp xếp
        if ($request->has('sort_by')) {
            switch ($request->sort_by) {
                case 'price_asc':
                    $query->orderBy('price', 'asc');
                    break;
                case 'price_desc':
                    $query->orderBy('price', 'desc');
                    break;
                case 'latest':
                    $query->latest();
                    break;
                case 'oldest':
                    $query->oldest();
                    break;
                case 'view_count':
                    $query->orderBy('view_count', 'desc');
                    break;
                default:
                    $query->latest();
                    break;
            }
        } else {
            $query->latest();
        }

        $products = $query->paginate(12);

        return new ProductCollection($products);
    }

    #[OA\Get(
        path: '/api/products/{id}',
        summary: 'Xem chi tiết sản phẩm',
        tags: ['Client - Products'],
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
        // Eager Loading sâu để lấy: Variants -> Attributes -> AttributeGroup
        $product = Product::with([
            'category',
            'brand',
            'images',
            'variants' => function ($q) {
                $q->where('is_active', true); // Chỉ lấy variant đang bán
            },
            'variants.attributes.attributeGroup',
        ])
        ->where('is_active', true)  // Không lấy sản phẩm đã ẩn
        ->find($id);

        if (!$product) {
            return response()->json(['message' => 'Không tìm thấy sản phẩm.'], 404);
        }

        // Tăng lượt xem
        $product->increment('view_count');

        return new ProductResource($product);
    }
}