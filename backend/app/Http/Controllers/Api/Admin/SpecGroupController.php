<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\SpecGroup;
use Illuminate\Http\Request;

class SpecGroupController extends Controller
{
    /**
     * GET /api/admin/spec-groups
     * Danh sách tất cả nhóm thông số
     */
    public function index()
    {
        $groups = SpecGroup::orderBy('display_order')->get();
        return response()->json(['data' => $groups]);
    }

    /**
     * POST /api/admin/spec-groups
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
        return response()->json(['message' => 'Tạo nhóm thông số thành công', 'data' => $group], 201);
    }

    /**
     * GET /api/admin/spec-groups/{id}
     * Chi tiết nhóm thông số
     */
    public function show(SpecGroup $specGroup)
    {
        return response()->json(['data' => $specGroup]);
    }

    /**
     * PUT /api/admin/spec-groups/{id}
     * Cập nhật nhóm thông số
     */
    public function update(Request $request, SpecGroup $specGroup)
    {
        $validated = $request->validate([
            'name'          => 'sometimes|string|max:100|unique:spec_groups,name,' . $specGroup->id,
            'display_name'  => 'sometimes|string|max:100',
            'display_order' => 'nullable|integer',
        ]);

        $specGroup->update($validated);
        return response()->json(['message' => 'Cập nhật thành công', 'data' => $specGroup]);
    }

    /**
     * DELETE /api/admin/spec-groups/{id}
     * Xóa nhóm thông số (cascade xóa tất cả specs dùng group này)
     */
    public function destroy(SpecGroup $specGroup)
    {
        $specGroup->delete();
        return response()->json(['message' => 'Đã xóa nhóm thông số']);
    }
}
