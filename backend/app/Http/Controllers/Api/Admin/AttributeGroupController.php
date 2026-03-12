<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\AttributeGroup\StoreAttributeGroupRequest;
use App\Http\Requests\Admin\AttributeGroup\UpdateAttributeGroupRequest;
use App\Http\Resources\AttributeGroupResource;
use App\Models\AttributeGroup;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use OpenApi\Attributes as OA;

class AttributeGroupController extends Controller
{
    /**
     * GET /api/admin/attribute-groups
     * List all attribute groups with their attributes.
     */
    #[OA\Get(
        path: '/api/admin/attribute-groups',
        summary: '[Admin] Lấy danh sách nhóm thuộc tính',
        tags: ['Admin - Attribute Groups'],
        security: [['sanctum' => []]],
        responses: [
            new OA\Response(response: 200, description: 'Danh sách nhóm thuộc tính')
        ]
    )]
    public function index(Request $request)
    {
        $query = AttributeGroup::query()->with(['attributes' => function ($q) {
            $q->orderBy('display_order')->orderBy('id');
        }]);

        if ($request->filled('search')) {
            $query->where(function($q) use ($request) {
                $q->where('name', 'like', '%' . $request->search . '%')
                  ->orWhere('display_name', 'like', '%' . $request->search . '%');
            });
        }

        $query->orderBy('display_order')->orderBy('id');

        $perPage = (int) $request->get('per_page', 10);

        if ($request->has('all')) {
            return AttributeGroupResource::collection($query->get());
        }

        return AttributeGroupResource::collection($query->paginate($perPage));
    }

    /**
     * POST /api/admin/attribute-groups
     * Create a new attribute group along with its attributes.
     */
    #[OA\Post(
        path: '/api/admin/attribute-groups',
        summary: '[Admin] Thêm nhóm thuộc tính',
        tags: ['Admin - Attribute Groups'],
        security: [['sanctum' => []]],
        responses: [
            new OA\Response(response: 201, description: 'Tạo thành công')
        ]
    )]
    public function store(StoreAttributeGroupRequest $request): JsonResponse
    {
        DB::beginTransaction();
        try {
            $group = AttributeGroup::create($request->only('name', 'display_name', 'display_order'));

            if ($request->has('attributes')) {
                foreach ($request->input('attributes') as $attr) {
                    $group->attributes()->create([
                        'value'         => $attr['value'],
                        'color_code'    => $attr['color_code'] ?? null,
                        'display_order' => $attr['display_order'] ?? 0,
                    ]);
                }
            }

            DB::commit();

            return response()->json([
                'status'  => true,
                'message' => 'Tạo nhóm thuộc tính thành công.',
                'data'    => $group->load('attributes'),
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'status'  => false,
                'message' => 'Lỗi khi tạo nhóm thuộc tính: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * GET /api/admin/attribute-groups/{id}
     * Get a specific attribute group.
     */
    #[OA\Get(
        path: '/api/admin/attribute-groups/{id}',
        summary: '[Admin] Lấy chi tiết nhóm thuộc tính',
        tags: ['Admin - Attribute Groups'],
        security: [['sanctum' => []]],
        responses: [
            new OA\Response(response: 200, description: 'Chi tiết nhóm thuộc tính')
        ]
    )]
    public function show(string $id): JsonResponse
    {
        $group = AttributeGroup::with(['attributes' => function ($q) {
            $q->orderBy('display_order')->orderBy('id');
        }])->findOrFail($id);

        return response()->json([
            'status' => true,
            'data'   => $group,
        ]);
    }

    /**
     * PUT /api/admin/attribute-groups/{id}
     * Update an attribute group and sync its attributes.
     */
    #[OA\Put(
        path: '/api/admin/attribute-groups/{id}',
        summary: '[Admin] Sửa nhóm thuộc tính',
        tags: ['Admin - Attribute Groups'],
        security: [['sanctum' => []]],
        responses: [
            new OA\Response(response: 200, description: 'Cập nhật thành công')
        ]
    )]
    public function update(UpdateAttributeGroupRequest $request, string $id): JsonResponse
    {
        $group = AttributeGroup::findOrFail($id);

        DB::beginTransaction();
        try {
            $group->update($request->only('name', 'display_name', 'display_order'));

            if ($request->has('attributes')) {
                $incomingAttrs = collect($request->input('attributes'));

                // Get IDs of incoming attributes that already have an ID
                $incomingResourceIds = $incomingAttrs->pluck('id')->filter()->all();

                // Delete attributes that are not in the incoming request
                $group->attributes()->whereNotIn('id', $incomingResourceIds)->delete();

                // Update existing or create new ones
                foreach ($incomingAttrs as $attr) {
                    if (isset($attr['id'])) {
                        $group->attributes()->where('id', $attr['id'])->update([
                            'value'         => $attr['value'],
                            'color_code'    => $attr['color_code'] ?? null,
                            'display_order' => $attr['display_order'] ?? 0,
                        ]);
                    } else {
                        $group->attributes()->create([
                            'value'         => $attr['value'],
                            'color_code'    => $attr['color_code'] ?? null,
                            'display_order' => $attr['display_order'] ?? 0,
                        ]);
                    }
                }
            } else {
                // If "attributes" key is explicitly empty, it means user removed all attributes
                $group->attributes()->delete();
            }

            DB::commit();

            return response()->json([
                'status'  => true,
                'message' => 'Cập nhật nhóm thuộc tính thành công.',
                'data'    => $group->load(['attributes' => function ($q) {
                    $q->orderBy('display_order')->orderBy('id');
                }]),
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'status'  => false,
                'message' => 'Lỗi khi cập nhật: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * DELETE /api/admin/attribute-groups/{id}
     * Delete an attribute group.
     */
    #[OA\Delete(
        path: '/api/admin/attribute-groups/{id}',
        summary: '[Admin] Xóa nhóm thuộc tính',
        tags: ['Admin - Attribute Groups'],
        security: [['sanctum' => []]],
        responses: [
            new OA\Response(response: 200, description: 'Xóa thành công')
        ]
    )]
    public function destroy(string $id): JsonResponse
    {
        $group = AttributeGroup::findOrFail($id);
        $group->delete(); // This will cascade delete attributes if cascade is setup on DB level, otherwise Laravel delete

        return response()->json([
            'status'  => true,
            'message' => 'Xóa nhóm thuộc tính thành công.',
        ]);
    }
}
