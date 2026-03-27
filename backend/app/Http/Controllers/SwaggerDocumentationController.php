<?php

namespace App\Http\Controllers;

use OpenApi\Attributes as OA;

#[OA\Info(
    title: "SpaceLink API Documents",
    version: "1.0.0",
    description: "API Document for SpaceLink"
)]
#[OA\Server(
    url: "http://localhost:8000",
    description: "Local Server"
)]
#[OA\SecurityScheme(
    securityScheme: "sanctum",
    type: "http",
    scheme: "bearer",
    bearerFormat: "JWT",
    description: "Nhập Token theo định dạng: Bearer {token}"
)]
#[OA\Tag(name: "Authentication", description: "Authentication")]
#[OA\Tag(name: "Password Reset", description: "Password Reset")]
#[OA\Tag(name: "Admin - Attributes", description: "Admin - Attributes")]
#[OA\Tag(name: "Admin - Banners", description: "Admin - Banners")]
#[OA\Tag(name: "Admin - Categories", description: "Admin - Categories")]
#[OA\Tag(name: "Admin - Contacts", description: "Admin - Contacts")]
#[OA\Tag(name: "Admin - Comments", description: "Admin - Comments")]
#[OA\Tag(name: "Admin - Dashboard", description: "Admin - Dashboard")]
#[OA\Tag(name: "Admin - News", description: "Admin - News")]
#[OA\Tag(name: "Admin - Orders", description: "Admin - Orders")]
#[OA\Tag(name: "Admin - Product Images", description: "Admin - Product Images")]
#[OA\Tag(name: "Admin - Product Variants", description: "Admin - Product Variants")]
#[OA\Tag(name: "Admin - Products", description: "Admin - Products")]
#[OA\Tag(name: "Admin - Product Specifications", description: "Admin - Product Specifications")]
#[OA\Tag(name: "Admin - Reviews", description: "Admin - Reviews")]
#[OA\Tag(name: "Admin - Shippings", description: "Admin - Shippings")]
#[OA\Tag(name: "Admin - Users", description: "Admin - Users")]
#[OA\Tag(name: "Admin - Vouchers", description: "Admin - Vouchers")]
#[OA\Tag(name: "Client - Address", description: "Client - Address")]
#[OA\Tag(name: "Client - Banners", description: "Client - Banners")]
#[OA\Tag(name: "Client - Brands", description: "Client - Brands")]
#[OA\Tag(name: "Client - Brands", description: "Client - Brands")]
#[OA\Tag(name: "Client - Cart", description: "Client - Cart")]
#[OA\Tag(name: "Client - Categories", description: "Client - Categories")]
#[OA\Tag(name: "Client - Checkout", description: "Client - Checkout")]
#[OA\Tag(name: "Client - Orders", description: "Client - Orders")]
#[OA\Tag(name: "Client - Products", description: "Client - Products")]
#[OA\Tag(name: "Client - Profile", description: "Client - Profile")]
#[OA\Tag(name: "Client - Reviews", description: "Client - Reviews")]
#[OA\Tag(name: "Client - Shippings", description: "Client - Shippings")]
#[OA\Tag(name: "Client - Wishlist", description: "Client - Wishlist")]
#[OA\Tag(name: "Public - Contacts", description: "Public - Contacts")]
#[OA\Tag(name: "Public - News", description: "Public - News")]
#[OA\Tag(name: "Public - Reviews", description: "Public - Reviews")]
#[OA\Tag(name: "Public - Search", description: "Public - Search (Scout database driver)")]
#[OA\Tag(name: "Client - Comments", description: "Client - Comments")]
#[OA\Tag(name: "Admin - Comments", description: "Admin - Comments")]
interface SwaggerDocumentationController
{
    // --- Api/Admin/CategoryControllerDocs.php ---
    #[OA\Get(
            path: '/api/admin/categories',
            summary: 'Danh sách tất cả danh mục (Admin)',
            description: 'Lấy danh sách toàn bộ danh mục kể cả inactive. Hỗ trợ filter theo `search`, `is_active`, `parent_id`.',
            tags: ['Admin - Categories'],
            security: [['sanctum' => []]],
            parameters: [
                new OA\Parameter(
                    name: 'search',
                    in: 'query',
                    description: 'Tìm kiếm theo tên danh mục',
                    required: false,
                    schema: new OA\Schema(type: 'string', example: 'Điện thoại')
                ),
                new OA\Parameter(
                    name: 'is_active',
                    in: 'query',
                    description: 'Lọc theo trạng thái: 1 = đang hiện, 0 = đã ẩn',
                    required: false,
                    schema: new OA\Schema(type: 'integer', enum: [0, 1])
                ),
                new OA\Parameter(
                    name: 'parent_id',
                    in: 'query',
                    description: 'Lọc theo danh mục cha (0 = chỉ lấy root)',
                    required: false,
                    schema: new OA\Schema(type: 'integer', example: 1)
                ),
            ],
            responses: [
                new OA\Response(
                    response: 200,
                    description: 'Danh sách danh mục',
                    content: new OA\JsonContent(
                        properties: [
                            new OA\Property(property: 'data', type: 'array', items: new OA\Items(type: 'object')),
                        ]
                    )
                ),
                new OA\Response(response: 401, description: 'Chưa xác thực'),
                new OA\Response(response: 403, description: 'Không có quyền Admin'),
            ]
        )]
    public function api_admin_categoryController_index();

    #[OA\Get(
            path: '/api/admin/categories/{id}',
            summary: 'Chi tiết danh mục (Admin)',
            description: 'Lấy thông tin chi tiết một danh mục theo ID, kể cả inactive.',
            tags: ['Admin - Categories'],
            security: [['sanctum' => []]],
            parameters: [
                new OA\Parameter(
                    name: 'id',
                    in: 'path',
                    description: 'ID của danh mục',
                    required: true,
                    schema: new OA\Schema(type: 'integer', example: 1)
                ),
            ],
            responses: [
                new OA\Response(response: 200, description: 'Chi tiết danh mục',
                    content: new OA\JsonContent(properties: [
                        new OA\Property(property: 'data', type: 'object'),
                    ])
                ),
                new OA\Response(response: 404, description: 'Không tìm thấy danh mục'),
                new OA\Response(response: 403, description: 'Không có quyền Admin'),
            ]
        )]
    public function api_admin_categoryController_show();

    #[OA\Post(
            path: '/api/admin/categories',
            summary: 'Tạo danh mục mới (Admin)',
            tags: ['Admin - Categories'],
            security: [['sanctum' => []]],
            requestBody: new OA\RequestBody(
                required: true,
                content: new OA\JsonContent(
                    required: ['name', 'slug'],
                    properties: [
                        new OA\Property(property: 'name',          type: 'string',  example: 'Điện thoại'),
                        new OA\Property(property: 'slug',          type: 'string',  example: 'dien-thoai'),
                        new OA\Property(property: 'parent_id',     type: 'integer', nullable: true, example: null),
                        new OA\Property(property: 'image',         type: 'string',  nullable: true, example: 'categories/phone.jpg'),
                        new OA\Property(property: 'icon',          type: 'string',  nullable: true, example: 'icons/phone.svg'),
                        new OA\Property(property: 'description',   type: 'string',  nullable: true, example: 'Danh mục điện thoại thông minh'),
                        new OA\Property(property: 'display_order', type: 'integer', example: 1),
                        new OA\Property(property: 'is_active',     type: 'boolean', example: true),
                    ]
                )
            ),
            responses: [
                new OA\Response(response: 201, description: 'Tạo thành công',
                    content: new OA\JsonContent(properties: [
                        new OA\Property(property: 'status',  type: 'boolean', example: true),
                        new OA\Property(property: 'message', type: 'string',  example: 'Tạo danh mục thành công'),
                        new OA\Property(property: 'data',    type: 'object'),
                    ])
                ),
                new OA\Response(response: 422, description: 'Lỗi validation'),
                new OA\Response(response: 403, description: 'Không có quyền Admin'),
            ]
        )]
    public function api_admin_categoryController_store();

    #[OA\Put(
            path: '/api/admin/categories/{id}',
            summary: 'Cập nhật danh mục (Admin)',
            tags: ['Admin - Categories'],
            security: [['sanctum' => []]],
            parameters: [
                new OA\Parameter(
                    name: 'id',
                    in: 'path',
                    required: true,
                    schema: new OA\Schema(type: 'integer', example: 1)
                ),
            ],
            requestBody: new OA\RequestBody(
                required: true,
                content: new OA\JsonContent(
                    required: ['name', 'slug'],
                    properties: [
                        new OA\Property(property: 'name',          type: 'string',  example: 'Điện thoại'),
                        new OA\Property(property: 'slug',          type: 'string',  example: 'dien-thoai'),
                        new OA\Property(property: 'parent_id',     type: 'integer', nullable: true, example: null),
                        new OA\Property(property: 'image',         type: 'string',  nullable: true, example: 'categories/phone.jpg'),
                        new OA\Property(property: 'icon',          type: 'string',  nullable: true, example: null),
                        new OA\Property(property: 'description',   type: 'string',  nullable: true, example: 'Mô tả mới'),
                        new OA\Property(property: 'display_order', type: 'integer', example: 2),
                        new OA\Property(property: 'is_active',     type: 'boolean', example: false),
                    ]
                )
            ),
            responses: [
                new OA\Response(response: 200, description: 'Cập nhật thành công',
                    content: new OA\JsonContent(properties: [
                        new OA\Property(property: 'status',  type: 'boolean', example: true),
                        new OA\Property(property: 'message', type: 'string',  example: 'Cập nhật danh mục thành công'),
                        new OA\Property(property: 'data',    type: 'object'),
                    ])
                ),
                new OA\Response(response: 404, description: 'Không tìm thấy danh mục'),
                new OA\Response(response: 422, description: 'Lỗi validation'),
                new OA\Response(response: 403, description: 'Không có quyền Admin'),
            ]
        )]
    public function api_admin_categoryController_update();

    #[OA\Delete(
            path: '/api/admin/categories/{id}',
            summary: 'Xóa mềm danh mục (Admin)',
            description: 'Soft delete — dữ liệu vẫn còn trong DB, chỉ đặt `deleted_at`. Có thể khôi phục sau.',
            tags: ['Admin - Categories'],
            security: [['sanctum' => []]],
            parameters: [
                new OA\Parameter(
                    name: 'id',
                    in: 'path',
                    required: true,
                    schema: new OA\Schema(type: 'integer', example: 1)
                ),
            ],
            responses: [
                new OA\Response(response: 200, description: 'Xóa thành công',
                    content: new OA\JsonContent(properties: [
                        new OA\Property(property: 'status',  type: 'boolean', example: true),
                        new OA\Property(property: 'message', type: 'string',  example: 'Xóa danh mục thành công'),
                    ])
                ),
                new OA\Response(response: 404, description: 'Không tìm thấy danh mục'),
                new OA\Response(response: 403, description: 'Không có quyền Admin'),
            ]
        )]
    public function api_admin_categoryController_destroy();

    // --- Api/Admin/OrderControllerDocs.php ---
    #[OA\Get(
            path: '/api/admin/orders',
            summary: '[Admin] Danh sách đơn hàng',
            tags: ['Admin - Orders'],
            security: [['sanctum' => []]],
            parameters: [
                new OA\Parameter(name: 'search',         in: 'query', required: false, schema: new OA\Schema(type: 'string'),  description: 'Tìm theo order_code, tên KH, SĐT'),
                new OA\Parameter(name: 'status',          in: 'query', required: false, schema: new OA\Schema(type: 'string'),  description: 'Lọc theo trạng thái đơn'),
                new OA\Parameter(name: 'payment_status',  in: 'query', required: false, schema: new OA\Schema(type: 'string'),  description: 'Lọc theo trạng thái thanh toán'),
                new OA\Parameter(name: 'payment_method',  in: 'query', required: false, schema: new OA\Schema(type: 'string'),  description: 'Lọc theo phương thức thanh toán'),
                new OA\Parameter(name: 'date_from',       in: 'query', required: false, schema: new OA\Schema(type: 'string', format: 'date'), description: 'Từ ngày (Y-m-d)'),
                new OA\Parameter(name: 'date_to',         in: 'query', required: false, schema: new OA\Schema(type: 'string', format: 'date'), description: 'Đến ngày (Y-m-d)'),
                new OA\Parameter(name: 'per_page',        in: 'query', required: false, schema: new OA\Schema(type: 'integer'), description: 'Số bản ghi/trang (mặc định 15)'),
            ],
            responses: [
                new OA\Response(response: 200, description: 'Thành công'),
                new OA\Response(response: 401, description: 'Chưa xác thực'),
                new OA\Response(response: 403, description: 'Không phải Admin'),
            ]
        )]
    public function api_admin_orderController_index();

    #[OA\Get(
            path: '/api/admin/orders/{id}',
            summary: '[Admin] Chi tiết đơn hàng',
            tags: ['Admin - Orders'],
            security: [['sanctum' => []]],
            parameters: [
                new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'), description: 'ID đơn hàng'),
            ],
            responses: [
                new OA\Response(response: 200, description: 'Thành công'),
                new OA\Response(response: 404, description: 'Không tìm thấy đơn hàng'),
            ]
        )]
    public function api_admin_orderController_show();

    #[OA\Patch(
            path: '/api/admin/orders/{id}/status',
            summary: '[Admin] Cập nhật trạng thái đơn hàng',
            tags: ['Admin - Orders'],
            security: [['sanctum' => []]],
            parameters: [
                new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
            ],
            requestBody: new OA\RequestBody(
                required: true,
                content: new OA\JsonContent(
                    required: ['status'],
                    properties: [
                        new OA\Property(property: 'status',             type: 'string', enum: ['pending', 'confirmed', 'processing', 'shipping', 'delivered', 'completed', 'cancelled', 'returned']),
                        new OA\Property(property: 'note',               type: 'string', nullable: true, description: 'Ghi chú nội bộ'),
                        new OA\Property(property: 'cancelled_reason',   type: 'string', nullable: true, description: 'Lý do hủy (bắt buộc khi status=cancelled)'),
                        new OA\Property(property: 'tracking_code',      type: 'string', nullable: true),
                        new OA\Property(property: 'shipping_partner',   type: 'string', nullable: true),
                        new OA\Property(property: 'estimated_delivery', type: 'string', format: 'date', nullable: true),
                    ]
                )
            ),
            responses: [
                new OA\Response(response: 200, description: 'Cập nhật thành công'),
                new OA\Response(response: 404, description: 'Không tìm thấy đơn hàng'),
                new OA\Response(response: 422, description: 'Validation thất bại'),
            ]
        )]
    public function api_admin_orderController_updateStatus();

    #[OA\Patch(
            path: '/api/admin/orders/{id}/payment-status',
            summary: '[Admin] Cập nhật trạng thái thanh toán',
            tags: ['Admin - Orders'],
            security: [['sanctum' => []]],
            parameters: [
                new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
            ],
            requestBody: new OA\RequestBody(
                required: true,
                content: new OA\JsonContent(
                    required: ['payment_status'],
                    properties: [
                        new OA\Property(property: 'payment_status', type: 'string', enum: ['unpaid', 'paid', 'refunded', 'partial_refund']),
                        new OA\Property(property: 'note',           type: 'string', nullable: true),
                    ]
                )
            ),
            responses: [
                new OA\Response(response: 200, description: 'Cập nhật thành công'),
                new OA\Response(response: 404, description: 'Không tìm thấy đơn hàng'),
                new OA\Response(response: 422, description: 'Validation thất bại'),
            ]
        )]
    public function api_admin_orderController_updatePaymentStatus();

    // --- Api/Admin/ProductControllerDocs.php ---
    #[OA\Get(
            path: '/api/admin/products',
            summary: '[Admin] Danh sách sản phẩm',
            tags: ['Admin - Products'],
            security: [['sanctum' => []]],
            parameters: [
                new OA\Parameter(name: 'search',      in: 'query', required: false, schema: new OA\Schema(type: 'string'),  description: 'Tìm theo tên, slug, SKU'),
                new OA\Parameter(name: 'category_id', in: 'query', required: false, schema: new OA\Schema(type: 'integer'), description: 'Lọc theo danh mục'),
                new OA\Parameter(name: 'brand_id',    in: 'query', required: false, schema: new OA\Schema(type: 'integer'), description: 'Lọc theo thương hiệu'),
                new OA\Parameter(name: 'is_active',   in: 'query', required: false, schema: new OA\Schema(type: 'boolean'), description: 'Lọc theo trạng thái'),
                new OA\Parameter(name: 'is_featured',  in: 'query', required: false, schema: new OA\Schema(type: 'boolean'), description: 'Lọc sản phẩm nổi bật'),
                new OA\Parameter(name: 'trashed',     in: 'query', required: false, schema: new OA\Schema(type: 'boolean'), description: 'true = chỉ lấy sản phẩm đã xóa mềm'),
                new OA\Parameter(name: 'per_page',    in: 'query', required: false, schema: new OA\Schema(type: 'integer'), description: 'Số bản ghi mỗi trang (mặc định 15)'),
            ],
            responses: [
                new OA\Response(response: 200, description: 'Thành công'),
                new OA\Response(response: 401, description: 'Chưa xác thực'),
                new OA\Response(response: 403, description: 'Không có quyền Admin'),
            ]
        )]
    public function api_admin_productController_index();

    #[OA\Get(
            path: '/api/admin/products/{id}',
            summary: '[Admin] Chi tiết sản phẩm',
            tags: ['Admin - Products'],
            security: [['sanctum' => []]],
            parameters: [
                new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'), description: 'ID sản phẩm'),
            ],
            responses: [
                new OA\Response(response: 200, description: 'Thành công'),
                new OA\Response(response: 404, description: 'Không tìm thấy sản phẩm'),
            ]
        )]
    public function api_admin_productController_show();

    #[OA\Post(
            path: '/api/admin/products',
            summary: '[Admin] Tạo sản phẩm mới',
            tags: ['Admin - Products'],
            security: [['sanctum' => []]],
            requestBody: new OA\RequestBody(
                required: true,
                content: new OA\JsonContent(
                    required: ['category_id', 'name', 'slug', 'price'],
                    properties: [
                        new OA\Property(property: 'category_id',      type: 'integer'),
                        new OA\Property(property: 'brand_id',         type: 'integer',  nullable: true),
                        new OA\Property(property: 'name',             type: 'string'),
                        new OA\Property(property: 'slug',             type: 'string'),
                        new OA\Property(property: 'sku',              type: 'string',   nullable: true),
                        new OA\Property(property: 'price',            type: 'number'),
                        new OA\Property(property: 'sale_price',       type: 'number',   nullable: true),
                        new OA\Property(property: 'quantity',         type: 'integer',  nullable: true),
                        new OA\Property(property: 'description',      type: 'string',   nullable: true),
                        new OA\Property(property: 'content',          type: 'string',   nullable: true),
                        new OA\Property(property: 'is_featured',       type: 'boolean',  nullable: true),
                        new OA\Property(property: 'is_active',        type: 'boolean',  nullable: true),
                        new OA\Property(property: 'meta_title',       type: 'string',   nullable: true),
                        new OA\Property(property: 'meta_description', type: 'string',   nullable: true),
                    ]
                )
            ),
            responses: [
                new OA\Response(response: 201, description: 'Tạo thành công'),
                new OA\Response(response: 422, description: 'Validation thất bại'),
            ]
        )]
    public function api_admin_productController_store();

    #[OA\Put(
            path: '/api/admin/products/{id}',
            summary: '[Admin] Cập nhật sản phẩm',
            tags: ['Admin - Products'],
            security: [['sanctum' => []]],
            parameters: [
                new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
            ],
            requestBody: new OA\RequestBody(
                required: true,
                content: new OA\JsonContent(
                    required: ['category_id', 'name', 'slug', 'price'],
                    properties: [
                        new OA\Property(property: 'category_id',      type: 'integer'),
                        new OA\Property(property: 'brand_id',         type: 'integer',  nullable: true),
                        new OA\Property(property: 'name',             type: 'string'),
                        new OA\Property(property: 'slug',             type: 'string'),
                        new OA\Property(property: 'sku',              type: 'string',   nullable: true),
                        new OA\Property(property: 'price',            type: 'number'),
                        new OA\Property(property: 'sale_price',       type: 'number',   nullable: true),
                        new OA\Property(property: 'quantity',         type: 'integer',  nullable: true),
                        new OA\Property(property: 'description',      type: 'string',   nullable: true),
                        new OA\Property(property: 'content',          type: 'string',   nullable: true),
                        new OA\Property(property: 'is_featured',       type: 'boolean',  nullable: true),
                        new OA\Property(property: 'is_active',        type: 'boolean',  nullable: true),
                        new OA\Property(property: 'meta_title',       type: 'string',   nullable: true),
                        new OA\Property(property: 'meta_description', type: 'string',   nullable: true),
                    ]
                )
            ),
            responses: [
                new OA\Response(response: 200, description: 'Cập nhật thành công'),
                new OA\Response(response: 404, description: 'Không tìm thấy sản phẩm'),
                new OA\Response(response: 422, description: 'Validation thất bại'),
            ]
        )]
    public function api_admin_productController_update();

    #[OA\Delete(
            path: '/api/admin/products/{id}',
            summary: '[Admin] Xóa mềm sản phẩm',
            tags: ['Admin - Products'],
            security: [['sanctum' => []]],
            parameters: [
                new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
            ],
            responses: [
                new OA\Response(response: 200, description: 'Đã xóa'),
                new OA\Response(response: 404, description: 'Không tìm thấy'),
            ]
        )]
    public function api_admin_productController_destroy();

    #[OA\Post(
            path: '/api/admin/products/{id}/restore',
            summary: '[Admin] Khôi phục sản phẩm đã xóa mềm',
            tags: ['Admin - Products'],
            security: [['sanctum' => []]],
            parameters: [
                new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'), description: 'ID sản phẩm đã bị xóa mềm'),
            ],
            responses: [
                new OA\Response(response: 200, description: 'Khôi phục thành công'),
                new OA\Response(response: 404, description: 'Không tìm thấy sản phẩm đã xóa'),
            ]
        )]
    public function api_admin_productController_restore();

    // --- Api/Admin/ProductImageControllerDocs.php ---
    #[OA\Post(
            path: '/api/admin/products/{product}/images',
            summary: '[Admin] Thêm ảnh sản phẩm',
            tags: ['Admin - Product Images'],
            security: [['sanctum' => []]],
            parameters: [
                new OA\Parameter(name: 'product', in: 'path', required: true, schema: new OA\Schema(type: 'integer'), description: 'ID sản phẩm'),
            ],
            requestBody: new OA\RequestBody(
                required: true,
                content: new OA\JsonContent(
                    required: ['image_path'],
                    properties: [
                        new OA\Property(property: 'image_path',    type: 'string',  description: 'Đường dẫn ảnh (relative: products/...)'),
                        new OA\Property(property: 'is_primary',    type: 'boolean', nullable: true, description: 'Có phải ảnh đại diện không?'),
                        new OA\Property(property: 'display_order', type: 'integer', nullable: true, description: 'Thứ tự hiển thị'),
                    ]
                )
            ),
            responses: [
                new OA\Response(response: 201, description: 'Thêm ảnh thành công'),
                new OA\Response(response: 404, description: 'Không tìm thấy sản phẩm'),
                new OA\Response(response: 422, description: 'Validation thất bại'),
            ]
        )]
    public function api_admin_productImageController_store();

    #[OA\Delete(
            path: '/api/admin/products/{product}/images/{image}',
            summary: '[Admin] Xóa ảnh sản phẩm',
            tags: ['Admin - Product Images'],
            security: [['sanctum' => []]],
            parameters: [
                new OA\Parameter(name: 'product', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
                new OA\Parameter(name: 'image',   in: 'path', required: true, schema: new OA\Schema(type: 'integer'), description: 'ID ảnh'),
            ],
            responses: [
                new OA\Response(response: 200, description: 'Đã xóa ảnh'),
                new OA\Response(response: 404, description: 'Không tìm thấy ảnh'),
            ]
        )]
    public function api_admin_productImageController_destroy();

// --- Api/Admin/ProductVariantControllerDocs.php ---
    #[OA\Get(
            path: '/api/admin/products/{product}/variants',
            summary: '[Admin] Lấy danh sách biến thể của sản phẩm',
            tags: ['Admin - Product Variants'],
            security: [['sanctum' => []]],
            parameters: [
                new OA\Parameter(name: 'product', in: 'path', required: true, schema: new OA\Schema(type: 'integer'), description: 'ID sản phẩm'),
            ],
            responses: [
                new OA\Response(response: 200, description: 'Danh sách biến thể'),
                new OA\Response(response: 404, description: 'Không tìm thấy sản phẩm'),
            ]
        )]
    public function api_admin_productVariantController_index();

    #[OA\Post(
            path: '/api/admin/products/{product}/variants',
            summary: '[Admin] Thêm biến thể cho sản phẩm',
            tags: ['Admin - Product Variants'],
            security: [['sanctum' => []]],
            parameters: [
                new OA\Parameter(name: 'product', in: 'path', required: true, schema: new OA\Schema(type: 'integer'), description: 'ID sản phẩm'),
            ],
            requestBody: new OA\RequestBody(
                required: true,
                content: new OA\MediaType(
                    mediaType: 'multipart/form-data',
                    schema: new OA\Schema(
                        required: ['price'],
                        properties: [
                            new OA\Property(property: 'sku',           type: 'string',  nullable: true),
                            new OA\Property(property: 'price',         type: 'number'),
                            new OA\Property(property: 'sale_price',    type: 'number',  nullable: true),
                            new OA\Property(property: 'quantity',      type: 'integer', nullable: true),
                            new OA\Property(property: 'image',         type: 'string',  format: 'binary', nullable: true, description: 'Tải ảnh biến thể'),
                            new OA\Property(property: 'is_active',     type: 'boolean', nullable: true),
                            new OA\Property(property: 'attribute_ids[]', type: 'array', items: new OA\Items(type: 'integer'), description: 'Danh sách ID thuộc tính (VD: 1, 5)'),
                        ]
                    )
                )
            ),
            responses: [
                new OA\Response(response: 201, description: 'Tạo variant thành công'),
                new OA\Response(response: 404, description: 'Không tìm thấy sản phẩm'),
                new OA\Response(response: 422, description: 'Validation thất bại'),
            ]
        )]
    public function api_admin_productVariantController_store();

    #[OA\Post(
            path: '/api/admin/products/{product}/variants/{variant}',
            summary: '[Admin] Cập nhật biến thể sản phẩm',
            description: 'Sử dụng POST với tham số `_method=PUT` do Laravel không hỗ trợ gửi form-data với PUT.',
            tags: ['Admin - Product Variants'],
            security: [['sanctum' => []]],
            parameters: [
                new OA\Parameter(name: 'product', in: 'path', required: true, schema: new OA\Schema(type: 'integer'), description: 'ID sản phẩm'),
                new OA\Parameter(name: 'variant', in: 'path', required: true, schema: new OA\Schema(type: 'integer'), description: 'ID biến thể'),
            ],
            requestBody: new OA\RequestBody(
                required: true,
                content: new OA\MediaType(
                    mediaType: 'multipart/form-data',
                    schema: new OA\Schema(
                        required: ['price', '_method'],
                        properties: [
                            new OA\Property(property: '_method',       type: 'string',  example: 'PUT', description: 'Ghi đè method POST -> PUT'),
                            new OA\Property(property: 'sku',           type: 'string',  nullable: true),
                            new OA\Property(property: 'price',         type: 'number'),
                            new OA\Property(property: 'sale_price',    type: 'number',  nullable: true),
                            new OA\Property(property: 'quantity',      type: 'integer', nullable: true),
                            new OA\Property(property: 'image',         type: 'string',  format: 'binary', nullable: true),
                            new OA\Property(property: 'is_active',     type: 'boolean', nullable: true),
                            new OA\Property(property: 'attribute_ids[]', type: 'array', items: new OA\Items(type: 'integer'), description: 'Danh sách ID thuộc tính'),
                        ]
                    )
                )
            ),
            responses: [
                new OA\Response(response: 200, description: 'Cập nhật thành công'),
                new OA\Response(response: 404, description: 'Không tìm thấy variant'),
                new OA\Response(response: 422, description: 'Validation thất bại'),
            ]
        )]
    public function api_admin_productVariantController_update();

    #[OA\Delete(
            path: '/api/admin/products/{product}/variants/{variant}',
            summary: '[Admin] Xóa biến thể sản phẩm',
            tags: ['Admin - Product Variants'],
            security: [['sanctum' => []]],
            parameters: [
                new OA\Parameter(name: 'product', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
                new OA\Parameter(name: 'variant', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
            ],
            responses: [
                new OA\Response(response: 200, description: 'Đã xóa variant'),
                new OA\Response(response: 404, description: 'Không tìm thấy variant'),
            ]
        )]
    public function api_admin_productVariantController_destroy();

    // --- Api/Admin/UserControllerDocs.php ---
    #[OA\Get(
            path: '/api/admin/users',
            summary: '[Admin] Danh sách người dùng',
            tags: ['Admin - Users'],
            security: [['sanctum' => []]],
            parameters: [
                new OA\Parameter(name: 'search',   in: 'query', required: false, schema: new OA\Schema(type: 'string'),  description: 'Tìm theo fullname, email, phone'),
                new OA\Parameter(name: 'role_id',  in: 'query', required: false, schema: new OA\Schema(type: 'integer'), description: '1=Admin, 2=Staff, 3=Customer'),
                new OA\Parameter(name: 'status',   in: 'query', required: false, schema: new OA\Schema(type: 'string'),  description: 'active | inactive | banned'),
                new OA\Parameter(name: 'trashed',  in: 'query', required: false, schema: new OA\Schema(type: 'boolean'), description: 'true = chỉ lấy user đã xóa mềm'),
                new OA\Parameter(name: 'per_page', in: 'query', required: false, schema: new OA\Schema(type: 'integer'), description: 'Số bản ghi/trang (mặc định 15)'),
            ],
            responses: [
                new OA\Response(response: 200, description: 'Thành công'),
                new OA\Response(response: 401, description: 'Chưa xác thực'),
                new OA\Response(response: 403, description: 'Không phải Admin'),
            ]
        )]
    public function api_admin_userController_index();

    #[OA\Get(
            path: '/api/admin/users/{id}',
            summary: '[Admin] Chi tiết người dùng',
            tags: ['Admin - Users'],
            security: [['sanctum' => []]],
            parameters: [
                new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'), description: 'ID người dùng'),
            ],
            responses: [
                new OA\Response(response: 200, description: 'Thành công'),
                new OA\Response(response: 404, description: 'Không tìm thấy'),
            ]
        )]
    public function api_admin_userController_show();

    #[OA\Put(
            path: '/api/admin/users/{id}',
            summary: '[Admin] Cập nhật thông tin người dùng',
            tags: ['Admin - Users'],
            security: [['sanctum' => []]],
            parameters: [
                new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
            ],
            requestBody: new OA\RequestBody(
                required: true,
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'fullname',      type: 'string',  nullable: true),
                        new OA\Property(property: 'phone',         type: 'string',  nullable: true),
                        new OA\Property(property: 'role_id',       type: 'integer', description: '1=Admin 2=Staff 3=Customer'),
                        new OA\Property(property: 'status',        type: 'string',  enum: ['active', 'inactive', 'banned']),
                        new OA\Property(property: 'gender',        type: 'string',  enum: ['male', 'female', 'other'], nullable: true),
                        new OA\Property(property: 'date_of_birth', type: 'string',  format: 'date', nullable: true),
                    ]
                )
            ),
            responses: [
                new OA\Response(response: 200, description: 'Cập nhật thành công'),
                new OA\Response(response: 404, description: 'Không tìm thấy'),
                new OA\Response(response: 422, description: 'Validation thất bại'),
            ]
        )]
    public function api_admin_userController_update();

    #[OA\Delete(
            path: '/api/admin/users/{id}',
            summary: '[Admin] Xóa mềm người dùng',
            tags: ['Admin - Users'],
            security: [['sanctum' => []]],
            parameters: [
                new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
            ],
            responses: [
                new OA\Response(response: 200, description: 'Đã xóa'),
                new OA\Response(response: 400, description: 'Không thể tự xóa chính mình'),
                new OA\Response(response: 404, description: 'Không tìm thấy'),
            ]
        )]
    public function api_admin_userController_destroy();

    #[OA\Post(
            path: '/api/admin/users/{id}/restore',
            summary: '[Admin] Khôi phục người dùng đã xóa mềm',
            tags: ['Admin - Users'],
            security: [['sanctum' => []]],
            parameters: [
                new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'), description: 'ID user đã bị xóa mềm'),
            ],
            responses: [
                new OA\Response(response: 200, description: 'Khôi phục thành công'),
                new OA\Response(response: 404, description: 'Không tìm thấy user đã xóa'),
                new OA\Response(response: 422, description: 'User chưa bị xóa'),
            ]
        )]
    public function api_admin_userController_restore();

    // --- Api/Admin/VoucherControllerDocs.php ---
    #[OA\Get(
            path: '/api/admin/vouchers',
            summary: '[Admin] Danh sách voucher',
            tags: ['Admin - Vouchers'],
            security: [['sanctum' => []]],
            parameters: [
                new OA\Parameter(name: 'search',    in: 'query', required: false, schema: new OA\Schema(type: 'string'),  description: 'Tìm theo code hoặc tên'),
                new OA\Parameter(name: 'is_active', in: 'query', required: false, schema: new OA\Schema(type: 'boolean'), description: 'Lọc theo trạng thái'),
                new OA\Parameter(name: 'per_page',  in: 'query', required: false, schema: new OA\Schema(type: 'integer'), description: 'Số bản ghi/trang (mặc định 15)'),
            ],
            responses: [
                new OA\Response(response: 200, description: 'Thành công'),
                new OA\Response(response: 401, description: 'Chưa xác thực'),
                new OA\Response(response: 403, description: 'Không phải Admin'),
            ]
        )]
    public function api_admin_voucherController_index();

    #[OA\Get(
            path: '/api/admin/vouchers/{id}',
            summary: '[Admin] Chi tiết voucher',
            tags: ['Admin - Vouchers'],
            security: [['sanctum' => []]],
            parameters: [
                new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
            ],
            responses: [
                new OA\Response(response: 200, description: 'Thành công'),
                new OA\Response(response: 404, description: 'Không tìm thấy'),
            ]
        )]
    public function api_admin_voucherController_show();

    #[OA\Post(
            path: '/api/admin/vouchers',
            summary: '[Admin] Tạo voucher mới',
            tags: ['Admin - Vouchers'],
            security: [['sanctum' => []]],
            requestBody: new OA\RequestBody(
                required: true,
                content: new OA\JsonContent(
                    required: ['code', 'name', 'discount_type', 'discount_value', 'start_date', 'end_date'],
                    properties: [
                        new OA\Property(property: 'code',                 type: 'string',  description: 'Mã voucher (viết hoa, unique)'),
                        new OA\Property(property: 'name',                 type: 'string',  description: 'Tên voucher'),
                        new OA\Property(property: 'description',          type: 'string',  nullable: true),
                        new OA\Property(property: 'discount_type',        type: 'string',  enum: ['percent', 'fixed'], description: 'Loại giảm giá'),
                        new OA\Property(property: 'discount_value',       type: 'number',  description: 'Giá trị giảm (% hoặc VNĐ)'),
                        new OA\Property(property: 'max_discount',         type: 'number',  nullable: true, description: 'Giảm tối đa (VNĐ, áp dụng cho percent)'),
                        new OA\Property(property: 'min_order_amount',     type: 'number',  description: 'Giá trị đơn tối thiểu để dùng'),
                        new OA\Property(property: 'quantity',             type: 'integer', nullable: true, description: 'Số lượt sử dụng (null = không giới hạn)'),
                        new OA\Property(property: 'usage_limit_per_user', type: 'integer', description: 'Giới hạn dùng per-user (0 = không giới hạn)'),
                        new OA\Property(property: 'start_date',           type: 'string',  format: 'date-time', description: 'Ngày bắt đầu'),
                        new OA\Property(property: 'end_date',             type: 'string',  format: 'date-time', description: 'Ngày kết thúc'),
                        new OA\Property(property: 'is_active',            type: 'boolean', description: 'Kích hoạt ngay'),
                    ]
                )
            ),
            responses: [
                new OA\Response(response: 201, description: 'Tạo thành công'),
                new OA\Response(response: 422, description: 'Validation thất bại'),
            ]
        )]
    public function api_admin_voucherController_store();

    #[OA\Put(
            path: '/api/admin/vouchers/{id}',
            summary: '[Admin] Cập nhật voucher',
            tags: ['Admin - Vouchers'],
            security: [['sanctum' => []]],
            parameters: [
                new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
            ],
            requestBody: new OA\RequestBody(
                required: true,
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'name',                 type: 'string'),
                        new OA\Property(property: 'description',          type: 'string',  nullable: true),
                        new OA\Property(property: 'discount_type',        type: 'string',  enum: ['percent', 'fixed']),
                        new OA\Property(property: 'discount_value',       type: 'number'),
                        new OA\Property(property: 'max_discount',         type: 'number',  nullable: true),
                        new OA\Property(property: 'min_order_amount',     type: 'number'),
                        new OA\Property(property: 'quantity',             type: 'integer', nullable: true),
                        new OA\Property(property: 'usage_limit_per_user', type: 'integer'),
                        new OA\Property(property: 'start_date',           type: 'string',  format: 'date-time'),
                        new OA\Property(property: 'end_date',             type: 'string',  format: 'date-time'),
                        new OA\Property(property: 'is_active',            type: 'boolean'),
                    ]
                )
            ),
            responses: [
                new OA\Response(response: 200, description: 'Cập nhật thành công'),
                new OA\Response(response: 404, description: 'Không tìm thấy'),
                new OA\Response(response: 422, description: 'Validation thất bại'),
            ]
        )]
    public function api_admin_voucherController_update();

    #[OA\Delete(
            path: '/api/admin/vouchers/{id}',
            summary: '[Admin] Xóa voucher',
            tags: ['Admin - Vouchers'],
            security: [['sanctum' => []]],
            parameters: [
                new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
            ],
            responses: [
                new OA\Response(response: 200, description: 'Đã xóa'),
                new OA\Response(response: 400, description: 'Voucher đang được sử dụng, không thể xóa'),
                new OA\Response(response: 404, description: 'Không tìm thấy'),
            ]
        )]
    public function api_admin_voucherController_destroy();

    // --- authDocs.php ---
    #[OA\Post(
        path: '/api/auth/forgot-password',
        summary: 'Gửi yêu cầu quên mật khẩu',
        description: 'Nhận email và gửi link reset mật khẩu qua email (Mail log trong storage/logs/laravel.log)',
        tags: ['Password Reset'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['email'],
                properties: [
                    new OA\Property(property: 'email', type: 'string', format: 'email', example: 'customer@example.com')
                ]
            )
        ),
        responses: [
            new OA\Response(response: 200, description: 'Đã gửi link reset thành công'),
            new OA\Response(response: 422, description: 'Email không tồn tại hoặc dữ liệu không hợp lệ'),
            new OA\Response(response: 500, description: 'Lỗi server khi gửi mail')
        ]
    )]
    public function auth_forgotPassword();

    #[OA\Post(
        path: '/api/auth/reset-password',
        summary: 'Đặt lại mật khẩu mới',
        description: 'Sử dụng token nhận được từ email để đặt lại mật khẩu',
        tags: ['Password Reset'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['email', 'token', 'password', 'password_confirmation'],
                properties: [
                    new OA\Property(property: 'email', type: 'string', format: 'email', example: 'customer@example.com'),
                    new OA\Property(property: 'token', type: 'string', description: 'Token nhận được từ email'),
                    new OA\Property(property: 'password', type: 'string', format: 'password', minLength: 6),
                    new OA\Property(property: 'password_confirmation', type: 'string', format: 'password')
                ]
            )
        ),
        responses: [
            new OA\Response(response: 200, description: 'Đặt lại mật khẩu thành công'),
            new OA\Response(response: 400, description: 'Token không hợp lệ hoặc đã hết hạn'),
            new OA\Response(response: 422, description: 'Lỗi validation (mật khẩu không khớp, min 6 ký tự...)')
        ]
    )]
    public function auth_resetPassword();

    #[OA\Post(
            path: '/api/auth/register',
            summary: 'Đăng ký tài khoản mới',
            tags: ['Authentication'],
            requestBody: new OA\RequestBody(
                required: true,
                content: new OA\JsonContent(
                    required: ['fullname', 'email', 'password', 'password_confirmation'],
                    properties: [
                        new OA\Property(property: 'fullname', type: 'string', example: 'Nguyen Van A'),
                        new OA\Property(property: 'email', type: 'string', format: 'email', example: 'user@example.com'),
                        new OA\Property(property: 'password', type: 'string', format: 'password', example: '123456'),
                        new OA\Property(property: 'password_confirmation', type: 'string', format: 'password', example: '123456'),
                        new OA\Property(property: 'phone', type: 'string', example: '0912345678'),
                    ]
                )
            ),
            responses: [
                new OA\Response(
                    response: 201,
                    description: 'Đăng ký thành công',
                    content: new OA\JsonContent(
                        properties: [
                            new OA\Property(property: 'status', type: 'boolean', example: true),
                            new OA\Property(property: 'message', type: 'string', example: 'Đăng ký thành công'),
                            new OA\Property(property: 'data', type: 'object', properties: [
                                new OA\Property(property: 'user', type: 'object'),
                                new OA\Property(property: 'token', type: 'string', example: '1|abcde...'),
                                new OA\Property(property: 'token_type', type: 'string', example: 'Bearer'),
                            ])
                        ]
                    )
                ),
                new OA\Response(response: 422, description: 'Lỗi kiểm tra dữ liệu')
            ]
        )]
    public function api_authController_register();

    #[OA\Post(
            path: '/api/auth/login',
            summary: 'Đăng nhập hệ thống',
            tags: ['Authentication'],
            requestBody: new OA\RequestBody(
                required: true,
                content: new OA\JsonContent(
                    required: ['email', 'password'],
                    properties: [
                        new OA\Property(property: 'email', type: 'string', example: 'user@example.com'),
                        new OA\Property(property: 'password', type: 'string', example: '123456'),
                    ]
                )
            ),
            responses: [
                new OA\Response(response: 200, description: 'Đăng nhập thành công'),
                new OA\Response(response: 401, description: 'Thông tin đăng nhập không chính xác')
            ]
        )]
    public function api_authController_login();

    #[OA\Get(
            path: '/api/auth/me',
            summary: 'Lấy thông tin người dùng hiện tại',
            tags: ['Authentication'],
            security: [['sanctum' => []]],
            responses: [
                new OA\Response(response: 200, description: 'Thành công'),
                new OA\Response(response: 401, description: 'Chưa xác thực')
            ]
        )]
    public function api_authController_me();

    #[OA\Post(
            path: '/api/auth/logout',
            summary: 'Đăng xuất tài khoản',
            tags: ['Authentication'],
            security: [['sanctum' => []]],
            responses: [
                new OA\Response(response: 200, description: 'Đăng xuất thành công')
            ]
        )]
    public function api_authController_logout();

    #[OA\Post(
            path: '/api/auth/change-password',
            summary: 'Đổi mật khẩu khi đã đăng nhập',
            tags: ['Authentication'],
            security: [['sanctum' => []]],
            requestBody: new OA\RequestBody(
                required: true,
                content: new OA\JsonContent(
                    required: ['current_password', 'password', 'password_confirmation'],
                    properties: [
                        new OA\Property(property: 'current_password',      type: 'string', format: 'password'),
                        new OA\Property(property: 'password',              type: 'string', format: 'password', minimum: 6),
                        new OA\Property(property: 'password_confirmation', type: 'string', format: 'password'),
                    ]
                )
            ),
            responses: [
                new OA\Response(response: 200, description: 'Đổi mật khẩu thành công'),
                new OA\Response(response: 401, description: 'Mật khẩu hiện tại không đúng'),
                new OA\Response(response: 422, description: 'Dữ liệu không hợp lệ'),
            ]
        )]
    public function api_authController_changePassword();

    // --- Api/Client/AddressControllerDocs.php ---
    #[OA\Get(
            path: '/api/addresses',
            summary: 'Danh sách địa chỉ của user hiện tại',
            tags: ['Client - Address'],
            security: [['sanctum' => []]],
            responses: [
                new OA\Response(
                    response: 200,
                    description: 'Danh sách địa chỉ',
                    content: new OA\JsonContent(
                        properties: [
                            new OA\Property(property: 'status', type: 'boolean', example: true),
                            new OA\Property(property: 'data', type: 'array', items: new OA\Items(
                                properties: [
                                    new OA\Property(property: 'id', type: 'integer'),
                                    new OA\Property(property: 'fullname', type: 'string'),
                                    new OA\Property(property: 'phone', type: 'string'),
                                    new OA\Property(property: 'province', type: 'string'),
                                    new OA\Property(property: 'district', type: 'string'),
                                    new OA\Property(property: 'ward', type: 'string'),
                                    new OA\Property(property: 'address_detail', type: 'string'),
                                    new OA\Property(property: 'is_default', type: 'boolean'),
                                    new OA\Property(property: 'address_type', type: 'string', enum: ['home', 'office', 'other']),
                                ]
                            )),
                        ]
                    )
                ),
                new OA\Response(response: 401, description: 'Chưa xác thực'),
            ]
        )]
    public function api_client_addressController_index();

    #[OA\Post(
            path: '/api/addresses',
            summary: 'Thêm địa chỉ mới',
            tags: ['Client - Address'],
            security: [['sanctum' => []]],
            requestBody: new OA\RequestBody(
                required: true,
                content: new OA\JsonContent(
                    required: ['fullname', 'phone', 'province', 'district', 'ward', 'address_detail'],
                    properties: [
                        new OA\Property(property: 'fullname',       type: 'string',  example: 'Nguyen Van A'),
                        new OA\Property(property: 'phone',          type: 'string',  example: '0912345678'),
                        new OA\Property(property: 'province',       type: 'string',  example: 'Hồ Chí Minh'),
                        new OA\Property(property: 'district',       type: 'string',  example: 'Quận 1'),
                        new OA\Property(property: 'ward',           type: 'string',  example: 'Phường Bến Nghé'),
                        new OA\Property(property: 'address_detail', type: 'string',  example: '123 Nguyễn Huệ'),
                        new OA\Property(property: 'is_default',     type: 'boolean', example: true),
                        new OA\Property(property: 'address_type',   type: 'string',  enum: ['home', 'office', 'other'], example: 'home'),
                    ]
                )
            ),
            responses: [
                new OA\Response(response: 201, description: 'Thêm thành công'),
                new OA\Response(response: 422, description: 'Lỗi validation'),
                new OA\Response(response: 401, description: 'Chưa xác thực'),
            ]
        )]
    public function api_client_addressController_store();

    #[OA\Get(
            path: '/api/addresses/{id}',
            summary: 'Chi tiết 1 địa chỉ',
            tags: ['Client - Address'],
            security: [['sanctum' => []]],
            parameters: [
                new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
            ],
            responses: [
                new OA\Response(response: 200, description: 'OK'),
                new OA\Response(response: 404, description: 'Không tìm thấy'),
                new OA\Response(response: 401, description: 'Chưa xác thực'),
            ]
        )]
    public function api_client_addressController_show();

    #[OA\Put(
            path: '/api/addresses/{id}',
            summary: 'Cập nhật địa chỉ',
            tags: ['Client - Address'],
            security: [['sanctum' => []]],
            parameters: [
                new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
            ],
            requestBody: new OA\RequestBody(
                required: true,
                content: new OA\JsonContent(
                    required: ['fullname', 'phone', 'province', 'district', 'ward', 'address_detail'],
                    properties: [
                        new OA\Property(property: 'fullname',       type: 'string',  example: 'Nguyen Van B'),
                        new OA\Property(property: 'phone',          type: 'string',  example: '0987654321'),
                        new OA\Property(property: 'province',       type: 'string',  example: 'Hà Nội'),
                        new OA\Property(property: 'district',       type: 'string',  example: 'Quận Hoàn Kiếm'),
                        new OA\Property(property: 'ward',           type: 'string',  example: 'Phường Hàng Bạc'),
                        new OA\Property(property: 'address_detail', type: 'string',  example: '45 Hàng Ngang'),
                        new OA\Property(property: 'is_default',     type: 'boolean', example: false),
                        new OA\Property(property: 'address_type',   type: 'string',  enum: ['home', 'office', 'other'], example: 'office'),
                    ]
                )
            ),
            responses: [
                new OA\Response(response: 200, description: 'Cập nhật thành công'),
                new OA\Response(response: 404, description: 'Không tìm thấy'),
                new OA\Response(response: 422, description: 'Lỗi validation'),
            ]
        )]
    public function api_client_addressController_update();

    #[OA\Delete(
            path: '/api/addresses/{id}',
            summary: 'Xóa địa chỉ',
            tags: ['Client - Address'],
            security: [['sanctum' => []]],
            parameters: [
                new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
            ],
            responses: [
                new OA\Response(response: 200, description: 'Xóa thành công'),
                new OA\Response(response: 404, description: 'Không tìm thấy'),
            ]
        )]
    public function api_client_addressController_destroy();

    // --- Api/Client/BrandControllerDocs.php ---
    #[OA\Get(
            path: '/api/brands',
            summary: 'Danh sách thương hiệu đang hoạt động',
            tags: ['Client - Brands'],
            responses: [
                new OA\Response(
                    response: 200,
                    description: 'Thành công',
                    content: new OA\JsonContent(
                        properties: [
                            new OA\Property(property: 'data', type: 'array', items: new OA\Items(
                                properties: [
                                    new OA\Property(property: 'id',            type: 'integer'),
                                    new OA\Property(property: 'name',          type: 'string'),
                                    new OA\Property(property: 'slug',          type: 'string'),
                                    new OA\Property(property: 'logo',          type: 'string', nullable: true),
                                    new OA\Property(property: 'display_order', type: 'integer'),
                                ]
                            )),
                        ]
                    )
                ),
            ]
        )]
    public function api_client_brandController_index();

    // --- Api/Client/CartControllerDocs.php ---
    #[OA\Get(
            path: '/api/client/cart',
            summary: 'Lấy danh sách giỏ hàng của user/session',
            tags: ['Client - Cart'],
            security: [['sanctum' => []]],
            parameters: [
                new OA\Parameter(
                    name: 'X-Session-ID',
                    in: 'header',
                    description: 'Session ID cho khách vãng lai (nếu chưa login)',
                    required: false,
                    schema: new OA\Schema(type: 'string')
                )
            ],
            responses: [
                new OA\Response(
                    response: 200,
                    description: 'Thành công',
                    content: new OA\JsonContent(
                        properties: [
                            new OA\Property(property: 'status', type: 'string', example: 'success'),
                            new OA\Property(property: 'data', type: 'array', items: new OA\Items(type: 'object')),
                            new OA\Property(property: 'total_items', type: 'integer', example: 3),
                            new OA\Property(property: 'total_price', type: 'number', example: 599000),
                        ]
                    )
                )
            ]
        )]
    public function api_client_cartController_index();

    #[OA\Post(
            path: '/api/client/cart/add',
            summary: 'Thêm sản phẩm vào giỏ hàng',
            tags: ['Client - Cart'],
            security: [['sanctum' => []]],
            parameters: [
                new OA\Parameter(
                    name: 'X-Session-ID',
                    in: 'header',
                    description: 'Session ID cho khách vãng lai',
                    required: false,
                    schema: new OA\Schema(type: 'string')
                )
            ],
            requestBody: new OA\RequestBody(
                required: true,
                content: new OA\JsonContent(
                    required: ['variant_id', 'quantity'],
                    properties: [
                        new OA\Property(property: 'variant_id', type: 'integer', description: 'ID của biến thể sản phẩm'),
                        new OA\Property(property: 'quantity', type: 'integer', description: 'Số lượng muốn thêm', minimum: 1),
                        new OA\Property(property: 'session_id', type: 'string', description: 'Session ID (dự phòng nếu không gửi qua header)', nullable: true),
                    ]
                )
            ),
            responses: [
                new OA\Response(response: 200, description: 'Thêm / cộng dồn số lượng thành công'),
                new OA\Response(response: 400, description: 'Thiếu User ID hoặc Session ID'),
                new OA\Response(response: 422, description: 'Dữ liệu không hợp lệ'),
            ]
        )]
    public function api_client_cartController_addToCart();

    #[OA\Put(
            path: '/api/client/cart/update/{cart_item_id}',
            summary: 'Cập nhật số lượng sản phẩm trong giỏ',
            tags: ['Client - Cart'],
            security: [['sanctum' => []]],
            parameters: [
                new OA\Parameter(name: 'cart_item_id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
                new OA\Parameter(name: 'X-Session-ID', in: 'header', required: false, schema: new OA\Schema(type: 'string')),
            ],
            requestBody: new OA\RequestBody(
                required: true,
                content: new OA\JsonContent(
                    required: ['quantity'],
                    properties: [new OA\Property(property: 'quantity', type: 'integer', minimum: 1)]
                )
            ),
            responses: [
                new OA\Response(response: 200, description: 'Cập nhật thành công'),
                new OA\Response(response: 403, description: 'Không có quyền'),
                new OA\Response(response: 404, description: 'Không tìm thấy cart item'),
                new OA\Response(response: 409, description: 'Số lượng vượt tồn kho'),
            ]
        )]
    public function api_client_cartController_updateQuantity();

    #[OA\Delete(
            path: '/api/client/cart/remove/{cart_item_id}',
            summary: 'Xóa 1 sản phẩm khỏi giỏ hàng',
            tags: ['Client - Cart'],
            security: [['sanctum' => []]],
            parameters: [
                new OA\Parameter(name: 'cart_item_id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
                new OA\Parameter(name: 'X-Session-ID', in: 'header', required: false, schema: new OA\Schema(type: 'string')),
            ],
            responses: [
                new OA\Response(response: 200, description: 'Đã xóa khỏi giỏ'),
                new OA\Response(response: 403, description: 'Không có quyền'),
                new OA\Response(response: 404, description: 'Không tìm thấy'),
            ]
        )]
    public function api_client_cartController_remove();

    #[OA\Delete(
            path: '/api/client/cart/clear',
            summary: 'Xóa toàn bộ giỏ hàng',
            tags: ['Client - Cart'],
            security: [['sanctum' => []]],
            parameters: [
                new OA\Parameter(name: 'X-Session-ID', in: 'header', required: false, schema: new OA\Schema(type: 'string')),
            ],
            responses: [
                new OA\Response(response: 200, description: 'Đã xóa toàn bộ giỏ hàng'),
                new OA\Response(response: 400, description: 'Thiếu định danh user/session'),
            ]
        )]
    public function api_client_cartController_clear();

    #[OA\Post(
            path: '/api/client/cart/merge',
            summary: 'Gộp giỏ hàng Guest vào tài khoản sau khi login',
            tags: ['Client - Cart'],
            security: [['sanctum' => []]],
            requestBody: new OA\RequestBody(
                required: true,
                content: new OA\JsonContent(
                    required: ['session_id'],
                    properties: [
                        new OA\Property(property: 'session_id', type: 'string', description: 'Session ID của giỏ hàng Guest cần gộp'),
                    ]
                )
            ),
            responses: [
                new OA\Response(response: 200, description: 'Gộp giỏ hàng thành công'),
                new OA\Response(response: 400, description: 'Thiếu session_id'),
            ]
        )]
    public function api_client_cartController_merge();

    // --- Api/Client/CategoryControllerDocs.php ---
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
    public function api_client_categoryController_index();

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
    public function api_client_categoryController_show();

    // --- Api/Client/CheckoutControllerDocs.php ---
    #[OA\Post(
            path: '/api/client/checkout',
            summary: 'Đặt hàng từ giỏ hàng hiện tại',
            tags: ['Client - Checkout'],
            security: [['sanctum' => []]],
            requestBody: new OA\RequestBody(
                required: true,
                content: new OA\JsonContent(
                    required: ['shipping_address_id', 'payment_method'],
                    properties: [
                        new OA\Property(property: 'shipping_address_id', type: 'integer', description: 'ID địa chỉ giao hàng của user'),
                        new OA\Property(property: 'payment_method', type: 'string', enum: ['cod', 'vnpay', 'momo', 'bank_transfer']),
                        new OA\Property(property: 'voucher_code', type: 'string', nullable: true, description: 'Mã voucher (không bắt buộc)'),
                        new OA\Property(property: 'note', type: 'string', nullable: true, description: 'Ghi chú đơn hàng'),
                    ]
                )
            ),
            responses: [
                new OA\Response(response: 201, description: 'Đặt hàng thành công'),
                new OA\Response(response: 400, description: 'Giỏ hàng rỗng hoặc lỗi nghiệp vụ'),
                new OA\Response(response: 403, description: 'Địa chỉ không thuộc về user này'),
                new OA\Response(response: 409, description: 'Tồn kho không đủ'),
                new OA\Response(response: 422, description: 'Dữ liệu không hợp lệ'),
            ]
        )]
    public function api_client_checkoutController_checkout();

    // --- Api/Client/OrderControllerDocs.php ---
    #[OA\Get(
            path: '/api/client/orders',
            summary: 'Danh sách đơn hàng của user',
            tags: ['Client - Orders'],
            security: [['sanctum' => []]],
            parameters: [
                new OA\Parameter(name: 'status',         in: 'query', required: false, schema: new OA\Schema(type: 'string'),  description: 'Lọc theo trạng thái: pending, confirmed, shipping, delivered, completed, cancelled'),
                new OA\Parameter(name: 'payment_status', in: 'query', required: false, schema: new OA\Schema(type: 'string'),  description: 'Lọc theo thanh toán: unpaid, paid, refunded'),
                new OA\Parameter(name: 'per_page',       in: 'query', required: false, schema: new OA\Schema(type: 'integer'), description: 'Số bản ghi/trang (mặc định 10)'),
            ],
            responses: [
                new OA\Response(response: 200, description: 'Thành công'),
                new OA\Response(response: 401, description: 'Chưa xác thực'),
            ]
        )]
    public function api_client_orderController_index();

    #[OA\Get(
            path: '/api/client/orders/{id}',
            summary: 'Chi tiết đơn hàng của user',
            tags: ['Client - Orders'],
            security: [['sanctum' => []]],
            parameters: [
                new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'), description: 'ID đơn hàng'),
            ],
            responses: [
                new OA\Response(response: 200, description: 'Thành công'),
                new OA\Response(response: 403, description: 'Không phải đơn hàng của bạn'),
                new OA\Response(response: 404, description: 'Không tìm thấy đơn hàng'),
            ]
        )]
    public function api_client_orderController_show();

    #[OA\Post(
            path: '/api/client/orders/{id}/cancel',
            summary: 'Hủy đơn hàng (chỉ khi đang ở trạng thái pending)',
            tags: ['Client - Orders'],
            security: [['sanctum' => []]],
            parameters: [
                new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
            ],
            requestBody: new OA\RequestBody(
                required: false,
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'reason', type: 'string', nullable: true, description: 'Lý do hủy đơn (không bắt buộc)'),
                    ]
                )
            ),
            responses: [
                new OA\Response(response: 200, description: 'Hủy đơn thành công'),
                new OA\Response(response: 403, description: 'Không phải đơn của bạn hoặc không thể hủy'),
                new OA\Response(response: 404, description: 'Không tìm thấy đơn hàng'),
                new OA\Response(response: 422, description: 'Đơn hàng không ở trạng thái có thể hủy'),
            ]
        )]
    public function api_client_orderController_cancel();

    // --- Api/Client/ProductControllerDocs.php ---
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
    public function api_client_productController_index();

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
    public function api_client_productController_show();

    #[OA\Get(
            path: '/api/products/compare',
            summary: 'So sánh thông số chi tiết sản phẩm',
            tags: ['Client - Products'],
            parameters: [
                new OA\Parameter(
                    name: 'slugs',
                    in: 'query',
                    description: 'Danh sách slug sản phẩm, cách nhau bởi dấu phẩy (VD: iphone-15,samsung-s24)',
                    required: true,
                    schema: new OA\Schema(type: 'string', example: 'iphone-15,samsung-s24')
                )
            ],
            responses: [
                new OA\Response(
                    response: 200,
                    description: 'Dữ liệu so sánh sản phẩm',
                    content: new OA\JsonContent(
                        properties: [
                            new OA\Property(property: 'products', type: 'array', items: new OA\Items(type: 'object')),
                            new OA\Property(property: 'specifications', type: 'array', items: new OA\Items(type: 'object')),
                        ]
                    )
                ),
                new OA\Response(
                    response: 400,
                    description: 'Thiếu ID hoặc ít hơn 2 sản phẩm'
                ),
                new OA\Response(
                    response: 404,
                    description: 'Không tìm thấy sản phẩm'
                )
            ]
        )]
    public function api_client_productController_compare();

    // --- Admin - Spec Groups ---
    #[OA\Get(
            path: '/api/admin/spec-groups',
            summary: '[Admin] Danh sách nhóm thông số kỹ thuật',
            tags: ['Admin - Product Specifications'],
            security: [['sanctum' => []]],
            responses: [
                new OA\Response(response: 200, description: 'Danh sách spec groups',
                    content: new OA\JsonContent(properties: [
                        new OA\Property(property: 'data', type: 'array', items: new OA\Items(properties: [
                            new OA\Property(property: 'id',            type: 'integer'),
                            new OA\Property(property: 'name',          type: 'string', example: 'screen'),
                            new OA\Property(property: 'display_name', type: 'string', example: 'Màn hình'),
                            new OA\Property(property: 'display_order', type: 'integer'),
                        ]))
                    ])
                ),
                new OA\Response(response: 401, description: 'Chưa xác thực'),
            ]
        )]
    public function api_admin_specGroupController_index();

    #[OA\Post(
            path: '/api/admin/spec-groups',
            summary: '[Admin] Tạo nhóm thông số kỹ thuật mới',
            tags: ['Admin - Product Specifications'],
            security: [['sanctum' => []]],
            requestBody: new OA\RequestBody(required: true, content: new OA\JsonContent(
                required: ['name', 'display_name'],
                properties: [
                    new OA\Property(property: 'name',          type: 'string', example: 'battery',     description: 'Slug nội bộ, unique'),
                    new OA\Property(property: 'display_name', type: 'string', example: 'Pin',          description: 'Tên hiển thị'),
                    new OA\Property(property: 'display_order', type: 'integer', example: 3, nullable: true),
                ]
            )),
            responses: [
                new OA\Response(response: 201, description: 'Tạo thành công'),
                new OA\Response(response: 422, description: 'Validation thất bại'),
            ]
        )]
    public function api_admin_specGroupController_store();

    #[OA\Put(
            path: '/api/admin/spec-groups/{id}',
            summary: '[Admin] Cập nhật nhóm thông số kỹ thuật',
            tags: ['Admin - Product Specifications'],
            security: [['sanctum' => []]],
            parameters: [new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
            requestBody: new OA\RequestBody(required: true, content: new OA\JsonContent(properties: [
                new OA\Property(property: 'name',          type: 'string'),
                new OA\Property(property: 'display_name', type: 'string'),
                new OA\Property(property: 'display_order', type: 'integer', nullable: true),
            ])),
            responses: [
                new OA\Response(response: 200, description: 'Cập nhật thành công'),
                new OA\Response(response: 404, description: 'Không tìm thấy'),
            ]
        )]
    public function api_admin_specGroupController_update();

    #[OA\Delete(
            path: '/api/admin/spec-groups/{id}',
            summary: '[Admin] Xóa nhóm thông số kỹ thuật',
            tags: ['Admin - Product Specifications'],
            security: [['sanctum' => []]],
            parameters: [new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
            responses: [
                new OA\Response(response: 200, description: 'Đã xóa'),
                new OA\Response(response: 404, description: 'Không tìm thấy'),
            ]
        )]
    public function api_admin_specGroupController_destroy();

    // --- Admin - Product Specifications ---
    #[OA\Get(
            path: '/api/admin/products/{product}/specifications',
            summary: '[Admin] Lấy thông số kỹ thuật của sản phẩm (nhóm theo spec_group)',
            tags: ['Admin - Product Specifications'],
            security: [['sanctum' => []]],
            parameters: [new OA\Parameter(name: 'product', in: 'path', required: true, schema: new OA\Schema(type: 'integer'), description: 'ID sản phẩm')],
            responses: [
                new OA\Response(response: 200, description: 'Danh sách thông số kỹ thuật theo nhóm'),
                new OA\Response(response: 404, description: 'Không tìm thấy sản phẩm'),
            ]
        )]
    public function api_admin_productSpecificationController_index();

    #[OA\Post(
            path: '/api/admin/products/{product}/specifications',
            summary: '[Admin] Thêm 1 thông số kỹ thuật',
            tags: ['Admin - Product Specifications'],
            security: [['sanctum' => []]],
            parameters: [new OA\Parameter(name: 'product', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
            requestBody: new OA\RequestBody(required: true, content: new OA\JsonContent(
                required: ['spec_group_id', 'name', 'value'],
                properties: [
                    new OA\Property(property: 'spec_group_id', type: 'integer', example: 1),
                    new OA\Property(property: 'name',          type: 'string',  example: 'Công nghệ màn hình'),
                    new OA\Property(property: 'value',         type: 'string',  example: 'AMOLED'),
                    new OA\Property(property: 'display_order', type: 'integer', nullable: true, example: 1),
                ]
            )),
            responses: [
                new OA\Response(response: 201, description: 'Thêm thành công'),
                new OA\Response(response: 422, description: 'Validation thất bại'),
            ]
        )]
    public function api_admin_productSpecificationController_store();

    #[OA\Put(
            path: '/api/admin/products/{product}/specifications/bulk',
            summary: '[Admin] Ghi đè toàn bộ thông số kỹ thuật của sản phẩm',
            description: 'Xóa tất cả thông số cũ và tạo lại từ dữ liệu gửi lên. Dùng để admin save form thông số một lần.',
            tags: ['Admin - Product Specifications'],
            security: [['sanctum' => []]],
            parameters: [new OA\Parameter(name: 'product', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
            requestBody: new OA\RequestBody(required: true, content: new OA\JsonContent(
                required: ['specifications'],
                properties: [
                    new OA\Property(property: 'specifications', type: 'array', items: new OA\Items(
                        required: ['spec_group_id', 'name', 'value'],
                        properties: [
                            new OA\Property(property: 'spec_group_id', type: 'integer'),
                            new OA\Property(property: 'name',          type: 'string'),
                            new OA\Property(property: 'value',         type: 'string'),
                            new OA\Property(property: 'display_order', type: 'integer', nullable: true),
                        ]
                    ))
                ]
            )),
            responses: [
                new OA\Response(response: 200, description: 'Cập nhật thành công'),
                new OA\Response(response: 422, description: 'Validation thất bại'),
            ]
        )]
    public function api_admin_productSpecificationController_bulk();

    #[OA\Put(
            path: '/api/admin/products/{product}/specifications/{specification}',
            summary: '[Admin] Cập nhật 1 thông số kỹ thuật',
            tags: ['Admin - Product Specifications'],
            security: [['sanctum' => []]],
            parameters: [
                new OA\Parameter(name: 'product',       in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
                new OA\Parameter(name: 'specification', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
            ],
            requestBody: new OA\RequestBody(required: true, content: new OA\JsonContent(properties: [
                new OA\Property(property: 'spec_group_id', type: 'integer'),
                new OA\Property(property: 'name',          type: 'string'),
                new OA\Property(property: 'value',         type: 'string'),
                new OA\Property(property: 'display_order', type: 'integer', nullable: true),
            ])),
            responses: [
                new OA\Response(response: 200, description: 'Cập nhật thành công'),
                new OA\Response(response: 404, description: 'Không tìm thấy'),
            ]
        )]
    public function api_admin_productSpecificationController_update();

    #[OA\Delete(
            path: '/api/admin/products/{product}/specifications/{specification}',
            summary: '[Admin] Xóa 1 thông số kỹ thuật',
            tags: ['Admin - Product Specifications'],
            security: [['sanctum' => []]],
            parameters: [
                new OA\Parameter(name: 'product',       in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
                new OA\Parameter(name: 'specification', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
            ],
            responses: [
                new OA\Response(response: 200, description: 'Đã xóa'),
                new OA\Response(response: 404, description: 'Không tìm thấy'),
            ]
        )]
    public function api_admin_productSpecificationController_destroy();

    // --- Api/Client/ProfileControllerDocs.php ---
    #[OA\Get(
            path: '/api/profile',
            summary: 'Lấy thông tin profile và danh sách địa chỉ',
            tags: ['Client - Profile'],
            security: [['sanctum' => []]],
            responses: [
                new OA\Response(response: 200, description: 'Thành công')
            ]
        )]
    public function api_client_profileController_show();

    #[OA\Put(
            path: '/api/profile',
            summary: 'Cập nhật thông tin cá nhân',
            tags: ['Client - Profile'],
            security: [['sanctum' => []]],
            requestBody: new OA\RequestBody(
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'fullname', type: 'string'),
                        new OA\Property(property: 'phone', type: 'string'),
                        new OA\Property(property: 'gender', type: 'string', enum: ['male', 'female', 'other']),
                        new OA\Property(property: 'date_of_birth', type: 'string', format: 'date'),
                    ]
                )
            ),
            responses: [
                new OA\Response(response: 200, description: 'Cập nhật thành công')
            ]
        )]
    public function api_client_profileController_update();

    // --- Reviews API ---
    #[OA\Get(
        path: '/api/products/{id}/reviews',
        summary: 'Danh sách đánh giá của sản phẩm (Public)',
        tags: ['Public - Reviews'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))
        ],
        responses: [
            new OA\Response(response: 200, description: 'Thành công')
        ]
    )]
    public function api_reviews_productReviews();

    #[OA\Post(
        path: '/api/client/reviews',
        summary: 'Gửi đánh giá sản phẩm (Client)',
        tags: ['Client - Reviews'],
        security: [['sanctum' => []]],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['order_item_id', 'rating', 'content'],
                properties: [
                    new OA\Property(property: 'order_item_id', type: 'integer'),
                    new OA\Property(property: 'rating', type: 'integer', minimum: 1, maximum: 5),
                    new OA\Property(property: 'content', type: 'string'),
                    new OA\Property(property: 'images', type: 'array', items: new OA\Items(type: 'string'), nullable: true)
                ]
            )
        ),
        responses: [
            new OA\Response(response: 201, description: 'Gửi thành công'),
            new OA\Response(response: 422, description: 'Dữ liệu không hợp lệ')
        ]
    )]
    public function api_client_reviews_store();

    #[OA\Get(
        path: '/api/admin/reviews',
        summary: 'Danh sách đánh giá (Admin)',
        tags: ['Admin - Reviews'],
        security: [['sanctum' => []]],
        responses: [
            new OA\Response(response: 200, description: 'Thành công')
        ]
    )]
    public function api_admin_reviews_index();

    #[OA\Patch(
        path: '/api/admin/reviews/{id}/reply',
        summary: 'Trả lời đánh giá (Admin)',
        tags: ['Admin - Reviews'],
        security: [['sanctum' => []]],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['reply_content'],
                properties: [
                    new OA\Property(property: 'reply_content', type: 'string')
                ]
            )
        ),
        responses: [
            new OA\Response(response: 200, description: 'Thành công')
        ]
    )]
    public function api_admin_reviews_reply();

    #[OA\Patch(
        path: '/api/admin/reviews/{id}/toggle-visibility',
        summary: 'Ẩn/Hiện đánh giá (Admin)',
        tags: ['Admin - Reviews'],
        security: [['sanctum' => []]],
        responses: [
            new OA\Response(response: 200, description: 'Thành công')
        ]
    )]
    public function api_admin_reviews_toggleVisibility();

    #[OA\Delete(
        path: '/api/admin/reviews/{id}',
        summary: 'Xóa đánh giá (Admin)',
        tags: ['Admin - Reviews'],
        security: [['sanctum' => []]],
        responses: [
            new OA\Response(response: 200, description: 'Thành công')
        ]
    )]
    public function api_admin_reviews_destroy();

    // --- Wishlist API ---
    #[OA\Get(
        path: '/api/client/wishlist',
        summary: 'Danh sách yêu thích (Client)',
        tags: ['Client - Wishlist'],
        security: [['sanctum' => []]],
        responses: [
            new OA\Response(response: 200, description: 'Thành công')
        ]
    )]
    public function api_client_wishlist_index();

    #[OA\Post(
        path: '/api/client/wishlist',
        summary: 'Thêm vào danh sách yêu thích (Client)',
        tags: ['Client - Wishlist'],
        security: [['sanctum' => []]],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['product_id'],
                properties: [
                    new OA\Property(property: 'product_id', type: 'integer')
                ]
            )
        ),
        responses: [
            new OA\Response(response: 201, description: 'Thành công')
        ]
    )]
    public function api_client_wishlist_store();

    #[OA\Delete(
        path: '/api/client/wishlist/{id}',
        summary: 'Xóa khỏi danh sách yêu thích (Client)',
        tags: ['Client - Wishlist'],
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'), description: 'Product ID')
        ],
        responses: [
            new OA\Response(response: 200, description: 'Thành công')
        ]
    )]
    public function api_client_wishlist_destroy();

    // --- News API ---
    #[OA\Get(
        path: '/api/news',
        summary: 'Danh sách tin tức (Public)',
        tags: ['Public - News'],
        responses: [
            new OA\Response(response: 200, description: 'Thành công')
        ]
    )]
    public function api_news_index();

    #[OA\Get(
        path: '/api/news/{slug}',
        summary: 'Chi tiết tin tức (Public)',
        tags: ['Public - News'],
        parameters: [
            new OA\Parameter(name: 'slug', in: 'path', required: true, schema: new OA\Schema(type: 'string'))
        ],
        responses: [
            new OA\Response(response: 200, description: 'Thành công')
        ]
    )]
    public function api_news_show();

    #[OA\Get(
        path: '/api/admin/news',
        summary: 'Quản lý tin tức (Admin)',
        tags: ['Admin - News'],
        security: [['sanctum' => []]],
        responses: [
            new OA\Response(response: 200, description: 'Thành công')
        ]
    )]
    public function api_admin_news_index();

    #[OA\Post(
        path: '/api/admin/news',
        summary: 'Tạo tin tức mới (Admin)',
        tags: ['Admin - News'],
        security: [['sanctum' => []]],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['title', 'content'],
                properties: [
                    new OA\Property(property: 'title', type: 'string'),
                    new OA\Property(property: 'summary', type: 'string'),
                    new OA\Property(property: 'content', type: 'string'),
                    new OA\Property(property: 'thumbnail', type: 'string'),
                    new OA\Property(property: 'is_featured', type: 'boolean'),
                    new OA\Property(property: 'is_active', type: 'boolean'),
                    new OA\Property(property: 'published_at', type: 'string', format: 'date-time')
                ]
            )
        ),
        responses: [
            new OA\Response(response: 201, description: 'Thành công')
        ]
    )]
    public function api_admin_news_store();

    #[OA\Put(
        path: '/api/admin/news/{id}',
        summary: 'Cập nhật tin tức (Admin)',
        tags: ['Admin - News'],
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'title', type: 'string'),
                    new OA\Property(property: 'content', type: 'string'),
                    new OA\Property(property: 'is_active', type: 'boolean')
                ]
            )
        ),
        responses: [
            new OA\Response(response: 200, description: 'Thành công')
        ]
    )]
    public function api_admin_news_update();

    #[OA\Delete(
        path: '/api/admin/news/{id}',
        summary: 'Xóa tin tức (Admin)',
        tags: ['Admin - News'],
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))
        ],
        responses: [
            new OA\Response(response: 200, description: 'Thành công')
        ]
    )]
    public function api_admin_news_destroy();

    // --- Contacts API ---
    #[OA\Post(
        path: '/api/contacts',
        summary: 'Gửi liên hệ (Public)',
        tags: ['Public - Contacts'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['fullname', 'email', 'subject', 'message'],
                properties: [
                    new OA\Property(property: 'name', type: 'string'),
                    new OA\Property(property: 'email', type: 'string', format: 'email'),
                    new OA\Property(property: 'phone', type: 'string'),
                    new OA\Property(property: 'subject', type: 'string'),
                    new OA\Property(property: 'message', type: 'string')
                ]
            )
        ),
        responses: [
            new OA\Response(response: 201, description: 'Gửi thành công')
        ]
    )]
    public function api_contacts_store();

    #[OA\Get(
        path: '/api/admin/contacts',
        summary: 'Danh sách liên hệ (Admin)',
        tags: ['Admin - Contacts'],
        security: [['sanctum' => []]],
        responses: [
            new OA\Response(response: 200, description: 'Thành công')
        ]
    )]
    public function api_admin_contacts_index();

    #[OA\Patch(
        path: '/api/admin/contacts/{id}/reply',
        summary: 'Phản hồi liên hệ (Admin)',
        tags: ['Admin - Contacts'],
        security: [['sanctum' => []]],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['reply_content'],
                properties: [
                    new OA\Property(property: 'reply_content', type: 'string')
                ]
            )
        ),
        responses: [
            new OA\Response(response: 200, description: 'Thành công')
        ]
    )]
    public function api_admin_contacts_reply();



    // --- Dashboard API ---
    #[OA\Get(
        path: '/api/admin/dashboard/stats',
        summary: 'Thống kê tổng quan (Admin)',
        tags: ['Admin - Dashboard'],
        security: [['sanctum' => []]],
        responses: [
            new OA\Response(response: 200, description: 'Thành công')
        ]
    )]
    public function api_admin_dashboard_stats();

    #[OA\Get(
        path: '/api/admin/dashboard/revenue',
        summary: 'Thống kê doanh thu (Admin)',
        tags: ['Admin - Dashboard'],
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(name: 'year', in: 'query', schema: new OA\Schema(type: 'integer'))
        ],
        responses: [
            new OA\Response(response: 200, description: 'Thành công')
        ]
    )]
    public function api_admin_dashboard_revenue();

    // --- Api/Admin/AttributeControllerDocs.php ---
    #[OA\Get(
        path: '/api/admin/attributes',
        summary: '[Admin] Lấy danh sách thuộc tính',
        tags: ['Admin - Attributes'],
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(name: 'group_id', in: 'query', required: false, schema: new OA\Schema(type: 'integer'), description: 'Lọc theo nhóm thuộc tính')
        ],
        responses: [
            new OA\Response(response: 200, description: 'Danh sách thuộc tính')
        ]
    )]
    public function api_admin_attributeController_index();

    #[OA\Post(
        path: '/api/admin/attributes',
        summary: '[Admin] Thêm thuộc tính',
        tags: ['Admin - Attributes'],
        security: [['sanctum' => []]],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['attribute_group_id', 'value'],
                properties: [
                    new OA\Property(property: 'attribute_group_id', type: 'integer', example: 1),
                    new OA\Property(property: 'value', type: 'string', example: 'Đỏ'),
                    new OA\Property(property: 'color_code', type: 'string', example: '#FF0000', nullable: true),
                    new OA\Property(property: 'display_order', type: 'integer', example: 1),
                ]
            )
        ),
        responses: [
            new OA\Response(response: 201, description: 'Thành công')
        ]
    )]
    public function api_admin_attributeController_store();

    #[OA\Put(
        path: '/api/admin/attributes/{id}',
        summary: '[Admin] Sửa thuộc tính',
        tags: ['Admin - Attributes'],
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'attribute_group_id', type: 'integer'),
                    new OA\Property(property: 'value', type: 'string'),
                    new OA\Property(property: 'color_code', type: 'string', nullable: true),
                    new OA\Property(property: 'display_order', type: 'integer'),
                ]
            )
        ),
        responses: [
            new OA\Response(response: 200, description: 'Thành công')
        ]
    )]
    public function api_admin_attributeController_update();

    #[OA\Delete(
        path: '/api/admin/attributes/{id}',
        summary: '[Admin] Xóa thuộc tính',
        tags: ['Admin - Attributes'],
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))
        ],
        responses: [
            new OA\Response(response: 200, description: 'Đã xóa')
        ]
    )]
    public function api_admin_attributeController_destroy();

    // --- Api/Admin/BannerControllerDocs.php ---
    #[OA\Get(
        path: '/api/admin/banners',
        summary: 'Danh sách banner (Admin)',
        tags: ['Admin - Banners'],
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(name: 'is_active', in: 'query', description: 'Lọc trạng thái is_active (0/1)', required: false, schema: new OA\Schema(type: 'integer', enum: [0, 1]))
        ],
        responses: [
            new OA\Response(response: 200, description: 'Danh sách banner')
        ]
    )]
    public function api_admin_bannerController_index();

    #[OA\Post(
        path: '/api/admin/banners',
        summary: 'Tạo banner mới (Admin)',
        tags: ['Admin - Banners'],
        security: [['sanctum' => []]],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\MediaType(
                mediaType: 'multipart/form-data',
                schema: new OA\Schema(
                    required: ['title', 'image'],
                    properties: [
                        new OA\Property(property: 'title', type: 'string'),
                        new OA\Property(property: 'image', type: 'string', format: 'binary'),
                        new OA\Property(property: 'description', type: 'string', nullable: true),
                        new OA\Property(property: 'link_url', type: 'string', nullable: true),
                        new OA\Property(property: 'display_order', type: 'integer', default: 0),
                        new OA\Property(property: 'start_date', type: 'string', format: 'date-time', nullable: true),
                        new OA\Property(property: 'end_date', type: 'string', format: 'date-time', nullable: true),
                        new OA\Property(property: 'is_active', type: 'boolean', default: true),
                    ]
                )
            )
        ),
        responses: [
            new OA\Response(response: 201, description: 'Tạo banner thành công')
        ]
    )]
    public function api_admin_bannerController_store();

    #[OA\Get(
        path: '/api/admin/banners/{id}',
        summary: 'Chi tiết banner (Admin)',
        tags: ['Admin - Banners'],
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))
        ],
        responses: [
            new OA\Response(response: 200, description: 'Chi tiết banner')
        ]
    )]
    public function api_admin_bannerController_show();

    #[OA\Post(
        path: '/api/admin/banners/{id}',
        summary: 'Cập nhật banner (Admin) - Dùng POST kèm _method=PUT',
        tags: ['Admin - Banners'],
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))
        ],
        requestBody: new OA\RequestBody(
            required: false,
            content: new OA\MediaType(
                mediaType: 'multipart/form-data',
                schema: new OA\Schema(
                    properties: [
                        new OA\Property(property: '_method', type: 'string', example: 'PUT'),
                        new OA\Property(property: 'title', type: 'string'),
                        new OA\Property(property: 'image', type: 'string', format: 'binary', nullable: true),
                        new OA\Property(property: 'description', type: 'string', nullable: true),
                        new OA\Property(property: 'link_url', type: 'string', nullable: true),
                        new OA\Property(property: 'display_order', type: 'integer'),
                        new OA\Property(property: 'start_date', type: 'string', format: 'date-time', nullable: true),
                        new OA\Property(property: 'end_date', type: 'string', format: 'date-time', nullable: true),
                        new OA\Property(property: 'is_active', type: 'boolean'),
                    ]
                )
            )
        ),
        responses: [
            new OA\Response(response: 200, description: 'Cập nhật banner thành công')
        ]
    )]
    public function api_admin_bannerController_update();

    #[OA\Delete(
        path: '/api/admin/banners/{id}',
        summary: 'Xóa banner (Admin)',
        tags: ['Admin - Banners'],
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))
        ],
        responses: [
            new OA\Response(response: 200, description: 'Xóa banner thành công')
        ]
    )]
    public function api_admin_bannerController_destroy();

    #[OA\Patch(
        path: '/api/admin/banners/{id}/toggle',
        summary: 'Bật/Tắt trạng thái banner (Admin)',
        tags: ['Admin - Banners'],
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))
        ],
        responses: [
            new OA\Response(response: 200, description: 'Thay đổi trạng thái thành công')
        ]
    )]
    public function api_admin_bannerController_toggle();

    // --- Api/Admin/ShippingControllerDocs.php ---
    #[OA\Get(
        path: '/api/admin/shippings',
        summary: 'Danh sách đơn vị vận chuyển (Admin)',
        tags: ['Admin - Shippings'],
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(name: 'is_active', in: 'query', description: 'Lọc trạng thái is_active (0/1)', required: false, schema: new OA\Schema(type: 'integer', enum: [0, 1]))
        ],
        responses: [
            new OA\Response(response: 200, description: 'Danh sách vận chuyển')
        ]
    )]
    public function api_admin_shippingController_index();

    #[OA\Post(
        path: '/api/admin/shippings',
        summary: 'Tạo đơn vị vận chuyển (Admin)',
        tags: ['Admin - Shippings'],
        security: [['sanctum' => []]],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\MediaType(
                mediaType: 'multipart/form-data',
                schema: new OA\Schema(
                    required: ['name'],
                    properties: [
                        new OA\Property(property: 'name', type: 'string'),
                        new OA\Property(property: 'code', type: 'string', nullable: true),
                        new OA\Property(property: 'logo', type: 'string', format: 'binary', nullable: true),
                        new OA\Property(property: 'base_fee', type: 'number', default: 0),
                        new OA\Property(property: 'is_active', type: 'boolean', default: true),
                    ]
                )
            )
        ),
        responses: [
            new OA\Response(response: 201, description: 'Tạo thành công')
        ]
    )]
    public function api_admin_shippingController_store();

    #[OA\Get(
        path: '/api/admin/shippings/{id}',
        summary: 'Chi tiết ĐVVC (Admin)',
        tags: ['Admin - Shippings'],
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))
        ],
        responses: [
            new OA\Response(response: 200, description: 'Chi tiết')
        ]
    )]
    public function api_admin_shippingController_show();

    #[OA\Post(
        path: '/api/admin/shippings/{id}',
        summary: 'Cập nhật ĐVVC (Admin) - Dùng POST kèm _method=PUT',
        tags: ['Admin - Shippings'],
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))
        ],
        requestBody: new OA\RequestBody(
            required: false,
            content: new OA\MediaType(
                mediaType: 'multipart/form-data',
                schema: new OA\Schema(
                    properties: [
                        new OA\Property(property: '_method', type: 'string', example: 'PUT'),
                        new OA\Property(property: 'name', type: 'string', nullable: true),
                        new OA\Property(property: 'code', type: 'string', nullable: true),
                        new OA\Property(property: 'logo', type: 'string', format: 'binary', nullable: true),
                        new OA\Property(property: 'base_fee', type: 'number', nullable: true),
                        new OA\Property(property: 'is_active', type: 'boolean', nullable: true),
                    ]
                )
            )
        ),
        responses: [
            new OA\Response(response: 200, description: 'Cập nhật thành công')
        ]
    )]
    public function api_admin_shippingController_update();

    #[OA\Delete(
        path: '/api/admin/shippings/{id}',
        summary: 'Xóa ĐVVC (Admin)',
        tags: ['Admin - Shippings'],
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))
        ],
        responses: [
            new OA\Response(response: 200, description: 'Xóa thành công')
        ]
    )]
    public function api_admin_shippingController_destroy();

    #[OA\Patch(
        path: '/api/admin/shippings/{id}/toggle',
        summary: 'Bật/Tắt trạng thái ĐVVC (Admin)',
        tags: ['Admin - Shippings'],
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))
        ],
        responses: [
            new OA\Response(response: 200, description: 'Thay đổi trạng thái thành công')
        ]
    )]
    public function api_admin_shippingController_toggle();

    // --- Api/Client/BannerControllerDocs.php ---
    #[OA\Get(
        path: '/api/client/banners',
        summary: 'Danh sách banner trang chủ (Client)',
        tags: ['Client - Banners'],
        responses: [
            new OA\Response(response: 200, description: 'Danh sách banner')
        ]
    )]
    public function api_client_bannerController_index();

    // --- Api/Client/ShippingControllerDocs.php ---
    #[OA\Get(
        path: '/api/client/shippings',
        summary: 'Danh sách đơn vị vận chuyển (Client)',
        tags: ['Client - Shippings'],
        security: [['sanctum' => []]],
        responses: [
            new OA\Response(response: 200, description: 'Danh sách VC')
        ]
    )]
    public function api_client_shippingController_index();

    // --- Api/Client/SearchControllerDocs ---
    #[OA\Get(
        path: '/api/search',
        summary: 'Tìm kiếm sản phẩm và tin tức',
        description: 'Tìm kiếm toàn văn bằng Laravel Scout (database driver). Yêu cầu tối thiểu **2 ký tự**. Giới hạn **60 request/phút/IP** (HTTP 429 nếu vượt).',
        tags: ['Public - Search'],
        parameters: [
            new OA\Parameter(
                name: 'q',
                in: 'query',
                description: 'Từ khóa tìm kiếm (bắt buộc)',
                required: true,
                schema: new OA\Schema(type: 'string', minLength: 2, maxLength: 255, example: 'iphone')
            ),
            new OA\Parameter(
                name: 'type',
                in: 'query',
                description: 'Loại kết quả cần tìm: `all` (mặc định), `products`, `news`',
                required: false,
                schema: new OA\Schema(type: 'string', enum: ['all', 'products', 'news'], default: 'all')
            ),
            new OA\Parameter(
                name: 'category_id',
                in: 'query',
                description: 'Lọc sản phẩm theo ID danh mục',
                required: false,
                schema: new OA\Schema(type: 'integer', example: 1)
            ),
            new OA\Parameter(
                name: 'brand_id',
                in: 'query',
                description: 'Lọc sản phẩm theo ID thương hiệu',
                required: false,
                schema: new OA\Schema(type: 'integer', example: 2)
            ),
            new OA\Parameter(
                name: 'min_price',
                in: 'query',
                description: 'Giá tối thiểu (VNĐ)',
                required: false,
                schema: new OA\Schema(type: 'number', example: 1000000)
            ),
            new OA\Parameter(
                name: 'max_price',
                in: 'query',
                description: 'Giá tối đa (VNĐ)',
                required: false,
                schema: new OA\Schema(type: 'number', example: 30000000)
            ),
            new OA\Parameter(
                name: 'sort_by',
                in: 'query',
                description: 'Sắp xếp kết quả: `latest` (mặc định), `price_asc`, `price_desc`, `relevance`',
                required: false,
                schema: new OA\Schema(type: 'string', enum: ['latest', 'price_asc', 'price_desc', 'relevance'])
            ),
            new OA\Parameter(
                name: 'per_page',
                in: 'query',
                description: 'Số kết quả mỗi trang (mặc định 12, tối đa 50)',
                required: false,
                schema: new OA\Schema(type: 'integer', minimum: 1, maximum: 50, default: 12)
            ),
            new OA\Parameter(
                name: 'page',
                in: 'query',
                description: 'Số trang hiện tại',
                required: false,
                schema: new OA\Schema(type: 'integer', example: 1)
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Kết quả tìm kiếm',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'status', type: 'string', example: 'success'),
                        new OA\Property(property: 'query',  type: 'string', example: 'iphone'),
                        new OA\Property(property: 'type',   type: 'string', example: 'all'),
                        new OA\Property(
                            property: 'data',
                            type: 'object',
                            properties: [
                                new OA\Property(
                                    property: 'products',
                                    type: 'object',
                                    properties: [
                                        new OA\Property(property: 'data',         type: 'array', items: new OA\Items(
                                            properties: [
                                                new OA\Property(property: 'id',            type: 'integer', example: 1),
                                                new OA\Property(property: 'name',          type: 'string',  example: 'iPhone 15 Pro'),
                                                new OA\Property(property: 'slug',          type: 'string',  example: 'iphone-15-pro'),
                                                new OA\Property(property: 'sku',           type: 'string',  example: 'IP15PRO'),
                                                new OA\Property(property: 'price',         type: 'number',  example: 29990000),
                                                new OA\Property(property: 'sale_price',    type: 'number',  nullable: true, example: 27990000),
                                                new OA\Property(property: 'thumbnail_url', type: 'string',  nullable: true, example: 'http://localhost:8000/storage/products/iphone.jpg'),
                                                new OA\Property(property: 'category',      type: 'object',  nullable: true),
                                                new OA\Property(property: 'brand',         type: 'object',  nullable: true),
                                            ]
                                        )),
                                        new OA\Property(property: 'total',        type: 'integer', example: 5),
                                        new OA\Property(property: 'per_page',     type: 'integer', example: 12),
                                        new OA\Property(property: 'current_page', type: 'integer', example: 1),
                                        new OA\Property(property: 'last_page',    type: 'integer', example: 1),
                                    ]
                                ),
                                new OA\Property(
                                    property: 'news',
                                    type: 'object',
                                    properties: [
                                        new OA\Property(property: 'data',         type: 'array', items: new OA\Items(type: 'object')),
                                        new OA\Property(property: 'total',        type: 'integer', example: 2),
                                        new OA\Property(property: 'per_page',     type: 'integer', example: 12),
                                        new OA\Property(property: 'current_page', type: 'integer', example: 1),
                                        new OA\Property(property: 'last_page',    type: 'integer', example: 1),
                                    ]
                                ),
                            ]
                        ),
                    ]
                )
            ),
            new OA\Response(
                response: 422,
                description: 'Thiếu hoặc sai param `q` (ví dụ: ngắn hơn 2 ký tự)',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'status',  type: 'string', example: 'error'),
                        new OA\Property(property: 'message', type: 'string', example: 'Dữ liệu không hợp lệ.'),
                        new OA\Property(property: 'errors',  type: 'object'),
                    ]
                )
            ),
            new OA\Response(
                response: 429,
                description: 'Quá nhiều request — Rate limit 60 req/phút/IP'
            ),
        ]
    )]
    public function api_public_searchController_search();

    #[OA\Get(
        path: '/api/search/autocomplete',
        summary: 'Gợi ý tìm kiếm (Autocomplete)',
        description: 'Trả về tối đa 8 sản phẩm gợi ý theo từ khóa. Kết quả được cache 5 phút. Yêu cầu tối thiểu **2 ký tự**. Giới hạn **60 request/phút/IP**.',
        tags: ['Public - Search'],
        parameters: [
            new OA\Parameter(
                name: 'q',
                in: 'query',
                description: 'Từ khóa gợi ý (tối thiểu 2 ký tự)',
                required: true,
                schema: new OA\Schema(type: 'string', minLength: 2, example: 'ip')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Danh sách gợi ý (mảng rỗng [] nếu q < 2 ký tự)',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'status', type: 'string', example: 'success'),
                        new OA\Property(property: 'query',  type: 'string', example: 'ip'),
                        new OA\Property(
                            property: 'data',
                            type: 'array',
                            items: new OA\Items(
                                properties: [
                                    new OA\Property(property: 'id',            type: 'integer', example: 1),
                                    new OA\Property(property: 'name',          type: 'string',  example: 'iPhone 15 Pro'),
                                    new OA\Property(property: 'slug',          type: 'string',  example: 'iphone-15-pro'),
                                    new OA\Property(property: 'price',         type: 'number',  example: 29990000),
                                    new OA\Property(property: 'sale_price',    type: 'number',  nullable: true, example: 27990000),
                                    new OA\Property(property: 'thumbnail_url', type: 'string',  nullable: true),
                                ]
                            )
                        ),
                    ]
                )
            ),
            new OA\Response(
                response: 429,
                description: 'Quá nhiều request — Rate limit 60 req/phút/IP'
            ),
        ]

    )]
    public function api_public_searchController_autocomplete();

    // --- Api/Client/CommentControllerDocs.php ---
    #[OA\Get(
        path: '/api/products/{productId}/comments',
        summary: 'Lấy danh sách bình luận (Public)',
        description: 'Lấy các bình luận đã được duyệt của một sản phẩm.',
        tags: ['Client - Comments'],
        parameters: [
            new OA\Parameter(name: 'productId', in: 'path', required: true, schema: new OA\Schema(type: 'integer'), description: 'ID sản phẩm'),
            new OA\Parameter(name: 'page', in: 'query', schema: new OA\Schema(type: 'integer'), description: 'Trang hiện tại'),
            new OA\Parameter(name: 'per_page', in: 'query', schema: new OA\Schema(type: 'integer'), description: 'Số bản ghi/trang'),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Thành công'),
            new OA\Response(response: 404, description: 'Sản phẩm không tồn tại'),
        ]
    )]
    public function api_client_commentController_index();

    #[OA\Post(
        path: '/api/client/comments',
        summary: 'Thêm bình luận mới (Auth)',
        description: 'Tạo bình luận mới (chờ duyệt).',
        tags: ['Client - Comments'],
        security: [['sanctum' => []]],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['product_id', 'content'],
                properties: [
                    new OA\Property(property: 'product_id', type: 'integer'),
                    new OA\Property(property: 'content', type: 'string'),
                    new OA\Property(property: 'parent_id', type: 'integer', nullable: true),
                ]
            )
        ),
        responses: [
            new OA\Response(response: 201, description: 'Tạo thành công chờ duyệt'),
            new OA\Response(response: 401, description: 'Chưa đăng nhập'),
            new OA\Response(response: 422, description: 'Lỗi validation'),
        ]
    )]
    public function api_client_commentController_store();

    #[OA\Get(
        path: '/api/comments/{id}',
        summary: 'Chi tiết bình luận (Public)',
        tags: ['Client - Comments'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Thành công'),
            new OA\Response(response: 404, description: 'Không tìm thấy'),
        ]
    )]
    public function api_client_commentController_show();

    #[OA\Get(
        path: '/api/comments/{id}/replies',
        summary: 'Danh sách replies phân trang (Public)',
        description: 'Lấy danh sách replies được duyệt của 1 bình luận gốc. Trả về mặc định 10 replies/trang.',
        tags: ['Client - Comments'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'), description: 'ID bình luận gốc'),
            new OA\Parameter(name: 'page', in: 'query', schema: new OA\Schema(type: 'integer')),
            new OA\Parameter(name: 'per_page', in: 'query', schema: new OA\Schema(type: 'integer')),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Thành công'),
            new OA\Response(response: 404, description: 'Không tìm thấy bình luận gốc'),
        ]
    )]
    public function api_client_commentController_replies();

    #[OA\Put(
        path: '/api/client/comments/{id}',
        summary: 'Cập nhật bình luận (Auth)',
        tags: ['Client - Comments'],
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['content'],
                properties: [
                    new OA\Property(property: 'content', type: 'string'),
                ]
            )
        ),
        responses: [
            new OA\Response(response: 200, description: 'Cập nhật thành công'),
            new OA\Response(response: 403, description: 'Không có quyền'),
            new OA\Response(response: 404, description: 'Không tìm thấy'),
        ]
    )]
    public function api_client_commentController_update();

    #[OA\Delete(
        path: '/api/client/comments/{id}',
        summary: 'Xóa bình luận cá nhân (Auth)',
        tags: ['Client - Comments'],
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Đã xóa'),
            new OA\Response(response: 403, description: 'Không có quyền'),
            new OA\Response(response: 404, description: 'Không tìm thấy'),
        ]
    )]
    public function api_client_commentController_destroy();

    // --- Api/Admin/CommentControllerDocs.php ---
    #[OA\Get(
        path: '/api/admin/comments',
        summary: '[Admin] Danh sách bình luận',
        tags: ['Admin - Comments'],
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(name: 'status', in: 'query', required: false, schema: new OA\Schema(type: 'string', enum: ['pending','approved','rejected'])),
            new OA\Parameter(name: 'product_id', in: 'query', required: false, schema: new OA\Schema(type: 'integer')),
            new OA\Parameter(name: 'keyword', in: 'query', required: false, schema: new OA\Schema(type: 'string')),
            new OA\Parameter(name: 'per_page', in: 'query', required: false, schema: new OA\Schema(type: 'integer')),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Thành công'),
            new OA\Response(response: 403, description: 'Không phải Admin'),
        ]
    )]
    public function api_admin_commentController_index();

    #[OA\Patch(
        path: '/api/admin/comments/{id}/approve',
        summary: '[Admin] Duyệt bình luận',
        tags: ['Admin - Comments'],
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Thành công'),
            new OA\Response(response: 404, description: 'Không tìm thấy'),
        ]
    )]
    public function api_admin_commentController_approve();

    #[OA\Patch(
        path: '/api/admin/comments/{id}/reject',
        summary: '[Admin] Từ chối bình luận',
        tags: ['Admin - Comments'],
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Thành công'),
            new OA\Response(response: 404, description: 'Không tìm thấy'),
        ]
    )]
    public function api_admin_commentController_reject();

    #[OA\Patch(
        path: '/api/admin/comments/{id}/toggle-hide',
        summary: '[Admin] Ẩn/Hiện bình luận',
        tags: ['Admin - Comments'],
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Thành công'),
            new OA\Response(response: 404, description: 'Không tìm thấy'),
        ]
    )]
    public function api_admin_commentController_toggleHide();

    #[OA\Delete(
        path: '/api/admin/comments/{id}',
        summary: '[Admin] Xóa bình luận',
        tags: ['Admin - Comments'],
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Đã xóa'),
            new OA\Response(response: 404, description: 'Không tìm thấy'),
        ]
    )]
    public function api_admin_commentController_destroy();
}
