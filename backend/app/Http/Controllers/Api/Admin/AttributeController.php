<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Attribute;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class AttributeController extends Controller
{
    public function index(Request $request)
    {
        $query = Attribute::with('attributeGroup');

        if ($request->filled('attribute_group_id')) {
            $query->where('attribute_group_id', $request->attribute_group_id);
        }

        $attributes = $query->orderBy('display_order')->get();

        return response()->json([
            'status' => 'success',
            'data' => $attributes,
        ]);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'attribute_group_id' => 'required|exists:attribute_groups,id',
            'value' => 'required|string|max:255',
            'color_code' => 'nullable|string|max:50',
            'display_order' => 'integer',
        ]);

        if ($validator->fails()) {
            return response()->json(['status' => 'error', 'errors' => $validator->errors()], 400);
        }

        $attribute = Attribute::create($request->all());

        return response()->json(['status' => 'success', 'data' => $attribute], 201);
    }

    public function show($id)
    {
        try {
            $attribute = Attribute::with('attributeGroup')->findOrFail($id);

            return response()->json(['status' => 'success', 'data' => $attribute]);
        } catch (\Exception $e) {
            return response()->json(['status' => 'error', 'message' => 'Không tìm thấy thuộc tính.'], 404);
        }
    }

    public function update(Request $request, $id)
    {
        $attribute = Attribute::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'attribute_group_id' => 'exists:attribute_groups,id',
            'value' => 'string|max:255',
            'color_code' => 'nullable|string|max:50',
            'display_order' => 'integer',
        ]);

        if ($validator->fails()) {
            return response()->json(['status' => 'error', 'errors' => $validator->errors()], 400);
        }

        $attribute->update($request->all());

        return response()->json(['status' => 'success', 'data' => $attribute]);
    }

    public function destroy($id)
    {
        $attribute = Attribute::findOrFail($id);

        // Check if attribute is used in variants (ProductVariantAttribute)
        // For now, allow deletion or add check if needed

        $attribute->delete();

        return response()->json(['status' => 'success', 'message' => 'Đã xóa giá trị thuộc tính.']);
    }
}
