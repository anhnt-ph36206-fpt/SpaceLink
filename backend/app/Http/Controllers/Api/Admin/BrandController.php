<?php
namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Brand;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class BrandController extends Controller
{
    public function index(Request $request)
    {
        $query = Brand::query();

        if ($request->filled('search')) {
            $query->where('name', 'like', '%' . $request->search . '%');
        }

        if ($request->has('is_active')) {
            $query->where('is_active', filter_var($request->is_active, FILTER_VALIDATE_BOOLEAN));
        }

        $query->orderBy('display_order')->orderBy('name');

        $perPage = (int) $request->get('per_page', 10);

        if ($request->has('all')) {
            return \App\Http\Resources\BrandResource::collection($query->get());
        }

        return \App\Http\Resources\BrandResource::collection($query->paginate($perPage));
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'name' => 'required|string|max:255|unique:brands,name',
            'is_active' => 'boolean',
            'display_order' => 'integer',
            'logo' => 'nullable|image|mimes:jpeg,png,jpg,gif,svg|max:2048',
        ]);

        $logoPath = null;
        if ($request->hasFile('logo')) {
            $logoPath = $request->file('logo')->store('brands', 'public');
        }

        $brand = Brand::create([
            'name'          => $request->name,
            'slug'          => Str::slug($request->name),
            'logo'          => $logoPath,
            'description'   => $request->description,
            'is_active'     => $request->is_active ?? true,
            'display_order' => $request->display_order ?? 0,
        ]);

        return response()->json([
            'status'  => true,
            'message' => 'Tạo thương hiệu thành công.',
            'data'    => $brand
        ], 201);
    }

    public function show(Brand $brand): JsonResponse
    {
        return response()->json([
            'status' => true,
            'data'   => $brand
        ]);
    }

    public function update(Request $request, Brand $brand): JsonResponse
    {
        $request->validate([
            'name' => 'string|max:255|unique:brands,name,' . $brand->id,
            'is_active' => 'boolean',
            'display_order' => 'integer',
            'logo' => 'nullable|image|mimes:jpeg,png,jpg,gif,svg|max:2048',
        ]);

        $data = $request->only(['name', 'description', 'is_active', 'display_order']);
        if ($request->has('name')) {
            $data['slug'] = Str::slug($request->name);
        }

        if ($request->hasFile('logo')) {
            // Delete old logo
            if ($brand->logo) {
                Storage::disk('public')->delete($brand->logo);
            }
            $data['logo'] = $request->file('logo')->store('brands', 'public');
        }

        $brand->update($data);

        return response()->json([
            'status'  => true,
            'message' => 'Cập nhật thương hiệu thành công.',
            'data'    => $brand
        ]);
    }

    public function destroy(Brand $brand): JsonResponse
    {
        $brand->delete();
        return response()->json([
            'status'  => true,
            'message' => 'Xóa thương hiệu thành công.'
        ]);
    }
}
