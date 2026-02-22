<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Address\StoreAddressRequest;
use App\Models\UserAddress;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

class AddressController extends Controller
{
    #[OA\Get(
        path: '/api/addresses',
        summary: 'Danh sách địa chỉ của user hiện tại',
        tags: ['Address'],
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
    public function index(Request $request)
    {
        return response()->json([
            'status' => true,
            'data'   => $request->user()->addresses,
        ]);
    }

    #[OA\Post(
        path: '/api/addresses',
        summary: 'Thêm địa chỉ mới',
        tags: ['Address'],
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
    public function store(StoreAddressRequest $request)
    {
        $user = $request->user();

        // Nếu đặt làm mặc định, bỏ mặc định của các địa chỉ cũ
        if ($request->is_default) {
            $user->addresses()->update(['is_default' => false]);
        }

        $address = $user->addresses()->create($request->validated());

        return response()->json([
            'status'  => true,
            'message' => 'Thêm địa chỉ thành công',
            'data'    => $address,
        ], 201);
    }

    #[OA\Get(
        path: '/api/addresses/{id}',
        summary: 'Chi tiết 1 địa chỉ',
        tags: ['Address'],
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
    public function show(Request $request, string $id)
    {
        $address = $request->user()->addresses()->findOrFail($id);
        return response()->json(['status' => true, 'data' => $address]);
    }

    #[OA\Put(
        path: '/api/addresses/{id}',
        summary: 'Cập nhật địa chỉ',
        tags: ['Address'],
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
    public function update(StoreAddressRequest $request, string $id)
    {
        $user    = $request->user();
        $address = $user->addresses()->findOrFail($id);

        if ($request->is_default) {
            $user->addresses()->where('id', '!=', $id)->update(['is_default' => false]);
        }

        $address->update($request->validated());

        return response()->json([
            'status'  => true,
            'message' => 'Cập nhật địa chỉ thành công',
            'data'    => $address,
        ]);
    }

    #[OA\Delete(
        path: '/api/addresses/{id}',
        summary: 'Xóa địa chỉ',
        tags: ['Address'],
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Xóa thành công'),
            new OA\Response(response: 404, description: 'Không tìm thấy'),
        ]
    )]
    public function destroy(Request $request, string $id)
    {
        $address = $request->user()->addresses()->findOrFail($id);
        $address->delete();

        return response()->json([
            'status'  => true,
            'message' => 'Xóa địa chỉ thành công',
        ]);
    }
}