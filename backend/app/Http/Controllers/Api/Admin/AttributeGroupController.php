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
