<?php

namespace App\Http\Controllers\Api\Client;

use App\Http\Controllers\Controller;
use App\Http\Requests\Address\StoreAddressRequest;
use App\Models\UserAddress;
use Illuminate\Http\Request;

class AddressController extends Controller
{    public function index(Request $request)
    {
        return response()->json([
            'status' => true,
            'data'   => $request->user()->addresses,
        ]);
    }    public function store(StoreAddressRequest $request)
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
    }    public function show(Request $request, string $id)
    {
        $address = $request->user()->addresses()->findOrFail($id);
        return response()->json(['status' => true, 'data' => $address]);
    }    public function update(StoreAddressRequest $request, string $id)
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
    }    public function destroy(Request $request, string $id)
    {
        $address = $request->user()->addresses()->findOrFail($id);
        $address->delete();

        return response()->json([
            'status'  => true,
            'message' => 'Xóa địa chỉ thành công',
        ]);
    }
}