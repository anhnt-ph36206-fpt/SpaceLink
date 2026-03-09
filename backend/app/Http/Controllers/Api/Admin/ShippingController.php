<?php
namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Shipping\StoreShippingRequest;
use App\Http\Requests\Admin\Shipping\UpdateShippingRequest;
use App\Models\Shipping;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ShippingController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Shipping::orderBy('id', 'desc');

        if ($request->has('is_active') && $request->is_active !== '') {
            $query->where('is_active', (bool) $request->is_active);
        }

        return response()->json([
            'status' => true,
            'data'   => $query->get()
        ]);
    }

    public function store(StoreShippingRequest $request): JsonResponse
    {
        $data = $request->validated();
        
        if ($request->hasFile('logo')) {
            $data['logo'] = $request->file('logo')->store('shippings', 'public');
        }

        if (!isset($data['base_fee'])) {
            $data['base_fee'] = 0;
        }

        $shipping = Shipping::create($data);

        return response()->json([
            'status'  => true,
            'message' => 'Tạo đơn vị vận chuyển thành công.',
            'data'    => $shipping
        ], 201);
    }

    public function show(string $id): JsonResponse
    {
        $shipping = Shipping::findOrFail($id);

        return response()->json([
            'status' => true,
            'data'   => $shipping
        ]);
    }

    public function update(UpdateShippingRequest $request, string $id): JsonResponse
    {
        $shipping = Shipping::findOrFail($id);
        $data = $request->validated();

        if ($request->hasFile('logo')) {
            if ($shipping->logo) {
                Storage::disk('public')->delete($shipping->logo);
            }
            $data['logo'] = $request->file('logo')->store('shippings', 'public');
        }

        $shipping->update($data);

        return response()->json([
            'status'  => true,
            'message' => 'Cập nhật đơn vị vận chuyển thành công.',
            'data'    => $shipping
        ]);
    }

    public function destroy(string $id): JsonResponse
    {
        $shipping = Shipping::findOrFail($id);
        
        // Cần kiểm tra logic FK nếu có, tạm thời xóa
        if ($shipping->logo) {
            Storage::disk('public')->delete($shipping->logo);
        }
        $shipping->delete();

        return response()->json([
            'status'  => true,
            'message' => 'Xóa đơn vị vận chuyển thành công.'
        ]);
    }

    public function toggle(string $id): JsonResponse
    {
        $shipping = Shipping::findOrFail($id);
        $shipping->is_active = !$shipping->is_active;
        $shipping->save();

        return response()->json([
            'status'  => true,
            'message' => 'Cập nhật trạng thái thành công.',
            'data'    => $shipping
        ]);
    }
}
