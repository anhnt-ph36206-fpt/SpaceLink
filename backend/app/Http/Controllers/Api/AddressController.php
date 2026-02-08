<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Address\StoreAddressRequest;
use App\Models\UserAddress;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

class AddressController extends Controller
{
    #[OA\Get(path: '/api/addresses', summary: 'Danh sách địa chỉ', tags: ['Address'], security: [['bearerAuth' => []]], responses: [new OA\Response(response: 200, description: 'OK')])]
    public function index(Request $request)
    {
        return response()->json([
            'status' => true,
            'data' => $request->user()->addresses
        ]);
    }

    #[OA\Post(path: '/api/addresses', summary: 'Thêm địa chỉ mới', tags: ['Address'], security: [['bearerAuth' => []]], responses: [new OA\Response(response: 201, description: 'Created')])]
    public function store(StoreAddressRequest $request)
    {
        $user = $request->user();

        // Nếu đặt làm mặc định, phải bỏ mặc định của các địa chỉ cũ
        if ($request->is_default) {
            $user->addresses()->update(['is_default' => false]);
        }

        // Tạo mới
        $address = $user->addresses()->create($request->validated());

        return response()->json([
            'status' => true,
            'message' => 'Thêm địa chỉ thành công',
            'data' => $address
        ], 201);
    }

    #[OA\Put(path: '/api/addresses/{id}', summary: 'Sửa địa chỉ', tags: ['Address'], security: [['bearerAuth' => []]], responses: [new OA\Response(response: 200, description: 'Updated')])]
    public function update(StoreAddressRequest $request, string $id)
    {
        $user = $request->user();
        // Tìm địa chỉ và đảm bảo nó thuộc về user này
        $address = $user->addresses()->findOrFail($id);

        if ($request->is_default) {
            $user->addresses()->where('id', '!=', $id)->update(['is_default' => false]);
        }

        $address->update($request->validated());

        return response()->json([
            'status' => true,
            'message' => 'Cập nhật địa chỉ thành công',
            'data' => $address
        ]);
    }

    #[OA\Delete(path: '/api/addresses/{id}', summary: 'Xóa địa chỉ', tags: ['Address'], security: [['bearerAuth' => []]], responses: [new OA\Response(response: 200, description: 'Deleted')])]
    public function destroy(Request $request, string $id)
    {
        $user = $request->user();
        $address = $user->addresses()->findOrFail($id);
        
        $address->delete();

        return response()->json([
            'status' => true,
            'message' => 'Xóa địa chỉ thành công'
        ]);
    }
}