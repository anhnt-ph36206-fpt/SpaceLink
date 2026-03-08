<?php
namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Banner\StoreBannerRequest;
use App\Http\Requests\Admin\Banner\UpdateBannerRequest;
use App\Models\Banner;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class BannerController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Banner::orderBy('display_order')->orderBy('id', 'desc');

        if ($request->has('is_active') && $request->is_active !== '') {
            $query->where('is_active', (bool) $request->is_active);
        }

        return response()->json([
            'status' => true,
            'data'   => $query->get()
        ]);
    }

    public function store(StoreBannerRequest $request): JsonResponse
    {
        $data = $request->validated();
        
        if ($request->hasFile('image')) {
            $data['image_url'] = $request->file('image')->store('banners', 'public');
        }

        $banner = Banner::create($data);

        return response()->json([
            'status'  => true,
            'message' => 'Tạo banner thành công.',
            'data'    => $banner
        ], 201);
    }

    public function show(string $id): JsonResponse
    {
        $banner = Banner::findOrFail($id);

        return response()->json([
            'status' => true,
            'data'   => $banner
        ]);
    }

    public function update(UpdateBannerRequest $request, string $id): JsonResponse
    {
        $banner = Banner::findOrFail($id);
        $data = $request->validated();

        if ($request->hasFile('image')) {
            if ($banner->image_url) {
                Storage::disk('public')->delete($banner->image_url);
            }
            $data['image_url'] = $request->file('image')->store('banners', 'public');
        }

        $banner->update($data);

        return response()->json([
            'status'  => true,
            'message' => 'Cập nhật banner thành công.',
            'data'    => $banner
        ]);
    }

    public function destroy(string $id): JsonResponse
    {
        $banner = Banner::findOrFail($id);
        if ($banner->image_url) {
            Storage::disk('public')->delete($banner->image_url);
        }
        $banner->delete();

        return response()->json([
            'status'  => true,
            'message' => 'Xóa banner thành công.'
        ]);
    }

    public function toggle(string $id): JsonResponse
    {
        $banner = Banner::findOrFail($id);
        $banner->is_active = !$banner->is_active;
        $banner->save();

        return response()->json([
            'status'  => true,
            'message' => 'Cập nhật trạng thái thành công.',
            'data'    => $banner
        ]);
    }
}
