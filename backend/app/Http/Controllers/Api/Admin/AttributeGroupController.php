<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\AttributeGroup\StoreAttributeGroupRequest;
use App\Http\Requests\Admin\AttributeGroup\UpdateAttributeGroupRequest;
use App\Models\AttributeGroup;
use Illuminate\Http\JsonResponse;
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
    public function index(): JsonResponse
    {
        $groups = AttributeGroup::with(['attributes' => function ($q) {
            $q->orderBy('display_order')->orderBy('id');
        }])
        ->orderBy('display_order')
        ->orderBy('id')
        ->get()
        ->map(function ($group) {
            return [
                'id'            => $group->id,
                'name'          => $group->name,
                'display_name'  => $group->display_name,
                'display_order' => $group->display_order,
                'attributes'    => $group->attributes->map(fn($a) => [
                    'id'            => $a->id,
                    'value'         => $a->value,
                    'color_code'    => $a->color_code,
                    'display_order' => $a->display_order,
                ]),
            ];
        });

        return response()->json([
            'status' => true,
            'data'   => $groups,
        ]);
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
<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\AttributeGroup;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class AttributeGroupController extends Controller
{
    public function index()
    {
        $groups = AttributeGroup::with('attributes')->orderBy('display_order')->get();
        return response()->json([
            'status' => 'success',
            'data'   => $groups
        ]);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name'          => 'required|string|max:255|unique:attribute_groups,name',
            'display_name'  => 'required|string|max:255',
            'display_order' => 'integer',
        ]);

        if ($validator->fails()) {
            return response()->json(['status' => 'error', 'errors' => $validator->errors()], 422);
        }

        $group = AttributeGroup::create($request->all());
        return response()->json(['status' => 'success', 'data' => $group], 201);
    }

    public function show($id)
    {
        try {
            $group = AttributeGroup::with('attributes')->findOrFail($id);
            return response()->json(['status' => 'success', 'data' => $group]);
        } catch (\Exception $e) {
            return response()->json(['status' => 'error', 'message' => 'Không tìm thấy nhóm thuộc tính.'], 404);
        }
    }

    public function update(Request $request, $id)
    {
        $group = AttributeGroup::findOrFail($id);
        
        $validator = Validator::make($request->all(), [
            'name'          => 'string|max:255|unique:attribute_groups,name,' . $id,
            'display_name'  => 'string|max:255',
            'display_order' => 'integer',
        ]);

        if ($validator->fails()) {
            return response()->json(['status' => 'error', 'errors' => $validator->errors()], 422);
        }

        $group->update($request->all());
        return response()->json(['status' => 'success', 'data' => $group]);
    }

    public function destroy($id)
    {
        $group = AttributeGroup::findOrFail($id);
        
        // Check if group has attributes
        if ($group->attributes()->exists()) {
             return response()->json([
                'status'  => 'error',
                'message' => 'Không thể xóa nhóm thuộc tính đang chứa các giá trị thuộc tính.'
            ], 400);
        }

        $group->delete();
        return response()->json(['status' => 'success', 'message' => 'Đã xóa nhóm thuộc tính.']);
    }
}
