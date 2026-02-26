<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\VoucherResource;
use App\Models\Voucher;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Validator;
use OpenApi\Attributes as OA;

class VoucherController extends Controller
{
    // =========================================================================
    // GET /api/admin/vouchers — Danh sách voucher (filter + paginate)
    // =========================================================================
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
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = Voucher::withCount('usages')->latest();

        if ($request->filled('search')) {
            $kw = $request->search;
            $query->where(function ($q) use ($kw) {
                $q->where('code', 'like', "%{$kw}%")
                  ->orWhere('name', 'like', "%{$kw}%");
            });
        }

        if ($request->has('is_active')) {
            $query->where('is_active', filter_var($request->is_active, FILTER_VALIDATE_BOOLEAN));
        }

        $perPage  = min((int) $request->get('per_page', 15), 100);

        return VoucherResource::collection($query->paginate($perPage));
    }

    // =========================================================================
    // GET /api/admin/vouchers/{id} — Chi tiết voucher
    // =========================================================================
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
    public function show(string $id): JsonResponse
    {
        $voucher = Voucher::withCount('usages')->findOrFail($id);

        return response()->json([
            'status' => 'success',
            'data'   => new VoucherResource($voucher),
        ]);
    }

    // =========================================================================
    // POST /api/admin/vouchers — Tạo voucher mới
    // =========================================================================
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
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'code'                 => 'required|string|max:50|unique:vouchers,code',
            'name'                 => 'required|string|max:255',
            'description'          => 'nullable|string',
            'discount_type'        => 'required|in:percent,fixed',
            'discount_value'       => 'required|numeric|min:0',
            'max_discount'         => 'nullable|numeric|min:0',
            'min_order_amount'     => 'nullable|numeric|min:0',
            'quantity'             => 'nullable|integer|min:1',
            'usage_limit_per_user' => 'nullable|integer|min:0',
            'start_date'           => 'required|date',
            'end_date'             => 'required|date|after_or_equal:start_date',
            'is_active'            => 'sometimes|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Dữ liệu không hợp lệ.',
                'errors'  => $validator->errors(),
            ], 422);
        }

        $data = $validator->validated();
        $data['code']       = strtoupper(trim($data['code']));
        $data['is_active']  = $data['is_active'] ?? true;
        $data['used_count'] = 0;
        $data['min_order_amount'] = $data['min_order_amount'] ?? 0;

        $voucher = Voucher::create($data);

        return response()->json([
            'status'  => 'success',
            'message' => 'Tạo voucher thành công.',
            'data'    => new VoucherResource($voucher),
        ], 201);
    }

    // =========================================================================
    // PUT /api/admin/vouchers/{id} — Cập nhật voucher
    // =========================================================================
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
    public function update(Request $request, string $id): JsonResponse
    {
        $voucher = Voucher::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'name'                 => 'sometimes|string|max:255',
            'description'          => 'nullable|string',
            'discount_type'        => 'sometimes|in:percent,fixed',
            'discount_value'       => 'sometimes|numeric|min:0',
            'max_discount'         => 'nullable|numeric|min:0',
            'min_order_amount'     => 'sometimes|numeric|min:0',
            'quantity'             => 'nullable|integer|min:1',
            'usage_limit_per_user' => 'sometimes|integer|min:0',
            'start_date'           => 'sometimes|date',
            'end_date'             => 'sometimes|date|after_or_equal:start_date',
            'is_active'            => 'sometimes|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Dữ liệu không hợp lệ.',
                'errors'  => $validator->errors(),
            ], 422);
        }

        $voucher->update($validator->validated());

        return response()->json([
            'status'  => 'success',
            'message' => 'Cập nhật voucher thành công.',
            'data'    => new VoucherResource($voucher),
        ]);
    }

    // =========================================================================
    // DELETE /api/admin/vouchers/{id} — Xóa voucher
    // =========================================================================
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
    public function destroy(string $id): JsonResponse
    {
        $voucher = Voucher::withCount('usages')->findOrFail($id);

        if ($voucher->usages_count > 0) {
            return response()->json([
                'status'  => 'error',
                'message' => "Voucher \"{$voucher->code}\" đã được sử dụng {$voucher->usages_count} lần, không thể xóa. Hãy vô hiệu hóa thay vì xóa.",
            ], 400);
        }

        $voucher->delete();

        return response()->json([
            'status'  => 'success',
            'message' => "Đã xóa voucher \"{$voucher->code}\" thành công.",
        ]);
    }
}
