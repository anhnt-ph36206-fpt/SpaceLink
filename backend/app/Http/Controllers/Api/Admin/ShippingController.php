<?php
namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Shipping\StoreShippingRequest;
use App\Http\Requests\Admin\Shipping\UpdateShippingRequest;
use App\Models\Shipping;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use OpenApi\Attributes as OA;

class ShippingController extends Controller
{
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
    public function show(string $id): JsonResponse
    {
        $shipping = Shipping::findOrFail($id);

        return response()->json([
            'status' => true,
            'data'   => $shipping
        ]);
    }

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
