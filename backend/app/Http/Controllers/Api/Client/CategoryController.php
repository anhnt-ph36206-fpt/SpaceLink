<?php

namespace App\Http\Controllers\Api\Client;

use App\Http\Controllers\Controller;
use App\Http\Resources\CategoryResource;
use App\Models\Category;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use OpenApi\Attributes as OA;

class CategoryController extends Controller
{
    /**
     * Lấy danh sách danh mục (phía Client).
     *
     * Query Params:
     *   ?type=tree  → Trả về cây danh mục (chỉ root + children eager load).
     *   (không có) → Flat list: toàn bộ danh mục active.
     *
     * Performance: Không N+1 — children được Eager Load trong 1 query.
     */
    #[OA\Get(
        path: '/api/client/categories',
        summary: 'Lấy danh sách danh mục (Client)',
        description: 'Trả về danh sách danh mục đang hoạt động. Truyền `?type=tree` để lấy dạng cây phân cấp (root + children). Mặc định trả về flat list.',
        tags: ['Client - Categories'],
        parameters: [
            new OA\Parameter(
                name: 'type',
                in: 'query',
                description: 'Kiểu dữ liệu: `tree` = danh mục cha và con riêng biệt, flat list = tất cả danh mục lồng nhau',
                required: false,
                schema: new OA\Schema(
                    type: 'string',
                    enum: ['tree'],
                    example: 'tree'
                )
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Danh sách danh mục thành công',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(
                            property: 'data',
                            type: 'array',
                            items: new OA\Items(
                                properties: [
                                    new OA\Property(property: 'id',          type: 'integer', example: 1),
                                    new OA\Property(property: 'name',        type: 'string',  example: 'Điện thoại'),
                                    new OA\Property(property: 'slug',        type: 'string',  example: 'dien-thoai'),
                                    new OA\Property(property: 'image',       type: 'string',  nullable: true, example: 'http://localhost/storage/categories/phone.jpg'),
                                    new OA\Property(property: 'icon',        type: 'string',  nullable: true, example: 'http://localhost/storage/icons/phone.svg'),
                                    new OA\Property(property: 'description', type: 'string',  nullable: true, example: 'Danh mục điện thoại thông minh'),
                                    new OA\Property(property: 'parent_id',   type: 'integer', nullable: true, example: null),
                                    new OA\Property(
                                        property: 'children',
                                        type: 'array',
                                        description: 'Danh sách con (chỉ có khi ?type=tree)',
                                        items: new OA\Items(type: 'object')
                                    ),
                                    new OA\Property(
                                        property: 'meta',
                                        type: 'object',
                                        properties: [
                                            new OA\Property(property: 'display_order', type: 'integer', example: 1),
                                        ]
                                    ),
                                ]
                            )
                        ),
                    ]
                )
            ),
        ]
    )]
    public function index(Request $request): AnonymousResourceCollection
    {
        // ── Base query: chỉ lấy active, sắp xếp theo display_order ──────────
        $query = Category::where('is_active', true)
                         ->orderBy('display_order', 'asc');

        // ── Chế độ Tree ──────────────────────────────────────────────────────
        if ($request->input('type') === 'tree') {
            $query
                // Chỉ lấy danh mục gốc (parent_id IS NULL)
                ->whereNull('parent_id')

                // Eager Load children — BẮT BUỘC ép điều kiện để loại bỏ
                // children đã bị ẩn (is_active = false), tránh lỗi N+1
                ->with(['children' => function ($q) {
                    $q->where('is_active', true)
                      ->orderBy('display_order', 'asc');

                    // ── Hỗ trợ danh mục cấp 3 (bật khi dự án có 3 cấp) ──
                    // $q->with(['children' => function ($subQ) {
                    //     $subQ->where('is_active', true)
                    //          ->orderBy('display_order', 'asc');
                    // }]);
                }]);
        }

        $categories = $query->get();

        return CategoryResource::collection($categories);
    }

    /**
     * Lấy chi tiết 1 danh mục theo slug (phía Client).
     *
     * - Tìm theo slug + is_active = true.
     * - Tự động load parent để trả về thông tin danh mục cha (nếu có).
     * - Trả về 404 nếu không tìm thấy hoặc danh mục đã bị ẩn.
     */
    #[OA\Get(
        path: '/api/client/categories/{slug}',
        summary: 'Xem chi tiết danh mục theo slug (Client)',
        description: 'Trả về thông tin chi tiết của một danh mục đang hoạt động. Tự động load thông tin danh mục cha (parent) nếu có.',
        tags: ['Client - Categories'],
        parameters: [
            new OA\Parameter(
                name: 'slug',
                in: 'path',
                description: 'Slug của danh mục (VD: dien-thoai)',
                required: true,
                schema: new OA\Schema(type: 'string', example: 'dien-thoai')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Chi tiết danh mục thành công',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(
                            property: 'data',
                            type: 'object',
                            properties: [
                                new OA\Property(property: 'id',          type: 'integer', example: 2),
                                new OA\Property(property: 'name',        type: 'string',  example: 'iPhone'),
                                new OA\Property(property: 'slug',        type: 'string',  example: 'iphone'),
                                new OA\Property(property: 'image',       type: 'string',  nullable: true, example: 'http://localhost/storage/categories/iphone.jpg'),
                                new OA\Property(property: 'icon',        type: 'string',  nullable: true, example: null),
                                new OA\Property(property: 'description', type: 'string',  nullable: true, example: 'Danh mục iPhone chính hãng'),
                                new OA\Property(property: 'parent_id',   type: 'integer', nullable: true, example: 1),
                                new OA\Property(
                                    property: 'parent',
                                    type: 'object',
                                    nullable: true,
                                    description: 'Thông tin danh mục cha',
                                    properties: [
                                        new OA\Property(property: 'id',   type: 'integer', example: 1),
                                        new OA\Property(property: 'name', type: 'string',  example: 'Điện thoại'),
                                        new OA\Property(property: 'slug', type: 'string',  example: 'dien-thoai'),
                                    ]
                                ),
                                new OA\Property(
                                    property: 'meta',
                                    type: 'object',
                                    properties: [
                                        new OA\Property(property: 'display_order', type: 'integer', example: 1),
                                    ]
                                ),
                            ]
                        ),
                    ]
                )
            ),
            new OA\Response(
                response: 404,
                description: 'Không tìm thấy danh mục hoặc danh mục đã bị ẩn',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'message', type: 'string', example: 'No query results for model [App\\Models\\Category].'),
                    ]
                )
            ),
        ]
    )]
    public function show(string $slug): CategoryResource
    {
        // firstOrFail() tự throw ModelNotFoundException → Laravel chuyển thành 404
        $category = Category::where('slug', $slug)
                            ->where('is_active', true)
                            ->with('parent')        // Eager load parent để không N+1
                            ->firstOrFail();

        return new CategoryResource($category);
    }
}
