<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\SpecGroup;
use Illuminate\Http\Request;

/**
 * SpecificationGroupController
 *
 * Được đăng ký tại route: /api/admin/specification-groups (apiResource)
 * Sử dụng model SpecGroup (bảng spec_groups)
 */
class SpecificationGroupController extends Controller
{
    /**
     * GET /api/admin/specification-groups
     * Danh sách tất cả nhóm thông số kỹ thuật
     */
    public function index()
    {
        $groups = SpecGroup::orderBy('display_order')->orderBy('id')->get();
        return response()->json(['data' => $groups]);
    }

    /**
     * POST /api/admin/specification-groups
     * Tạo nhóm thông số mới
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'          => 'required|string|max:100|unique:spec_groups,name',
            'display_name'  => 'required|string|max:100',
            'display_order' => 'nullable|integer',
        ]);

        $group = SpecGroup::create($validated);

        return response()->json([
            'message' => 'Tạo nhóm thông số thành công',
            'data'    => $group,
        ], 201);
    }

    /**
     * GET /api/admin/specification-groups/{specificationGroup}
     * Chi tiết nhóm thông số
     */
    public function show(SpecGroup $specificationGroup)
    {
        return response()->json(['data' => $specificationGroup]);
    }

    /**
     * PUT /api/admin/specification-groups/{specificationGroup}
     * Cập nhật nhóm thông số
     */
    public function update(Request $request, SpecGroup $specificationGroup)
    {
        $validated = $request->validate([
            'name'          => 'sometimes|string|max:100|unique:spec_groups,name,' . $specificationGroup->id,
            'display_name'  => 'sometimes|string|max:100',
            'display_order' => 'nullable|integer',
        ]);

        $specificationGroup->update($validated);

        return response()->json([
            'message' => 'Cập nhật thành công',
            'data'    => $specificationGroup,
        ]);
    }

    /**
     * DELETE /api/admin/specification-groups/{specificationGroup}
     * Xóa nhóm thông số
     */
    public function destroy(SpecGroup $specificationGroup)
    {
        $specificationGroup->delete();
        return response()->json(['message' => 'Đã xóa nhóm thông số']);
    }
}
