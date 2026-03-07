<?php
namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Banner\StoreBannerRequest;
use App\Http\Requests\Admin\Banner\UpdateBannerRequest;
use App\Models\Banner;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use OpenApi\Attributes as OA;

class BannerController extends Controller
{
    #[OA\Get(
        path: '/api/admin/banners',
        summary: 'Danh sách banner (Admin)',
        tags: ['Admin - Banners'],
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(name: 'is_active', in: 'query', description: 'Lọc trạng thái is_active (0/1)', required: false, schema: new OA\Schema(type: 'integer', enum: [0, 1]))
        ],
        responses: [
            new OA\Response(response: 200, description: 'Danh sách banner')
        ]
    )]
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

    #[OA\Post(
        path: '/api/admin/banners',
        summary: 'Tạo banner mới (Admin)',
        tags: ['Admin - Banners'],
        security: [['sanctum' => []]],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\MediaType(
                mediaType: 'multipart/form-data',
                schema: new OA\Schema(
                    required: ['title', 'image'],
                    properties: [
                        new OA\Property(property: 'title', type: 'string'),
                        new OA\Property(property: 'image', type: 'string', format: 'binary'),
                        new OA\Property(property: 'description', type: 'string', nullable: true),
                        new OA\Property(property: 'link_url', type: 'string', nullable: true),
                        new OA\Property(property: 'display_order', type: 'integer', default: 0),
                        new OA\Property(property: 'start_date', type: 'string', format: 'date-time', nullable: true),
                        new OA\Property(property: 'end_date', type: 'string', format: 'date-time', nullable: true),
                        new OA\Property(property: 'is_active', type: 'boolean', default: true),
                    ]
                )
            )
        ),
        responses: [
            new OA\Response(response: 201, description: 'Tạo banner thành công')
        ]
    )]
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

    #[OA\Get(
        path: '/api/admin/banners/{id}',
        summary: 'Chi tiết banner (Admin)',
        tags: ['Admin - Banners'],
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))
        ],
        responses: [
            new OA\Response(response: 200, description: 'Chi tiết banner')
        ]
    )]
    public function show(string $id): JsonResponse
    {
        $banner = Banner::findOrFail($id);

        return response()->json([
            'status' => true,
            'data'   => $banner
        ]);
    }

    #[OA\Post(
        path: '/api/admin/banners/{id}',
        summary: 'Cập nhật banner (Admin) - Dùng POST kèm _method=PUT',
        tags: ['Admin - Banners'],
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
                        new OA\Property(property: 'title', type: 'string'),
                        new OA\Property(property: 'image', type: 'string', format: 'binary', nullable: true),
                        new OA\Property(property: 'description', type: 'string', nullable: true),
                        new OA\Property(property: 'link_url', type: 'string', nullable: true),
                        new OA\Property(property: 'display_order', type: 'integer'),
                        new OA\Property(property: 'start_date', type: 'string', format: 'date-time', nullable: true),
                        new OA\Property(property: 'end_date', type: 'string', format: 'date-time', nullable: true),
                        new OA\Property(property: 'is_active', type: 'boolean'),
                    ]
                )
            )
        ),
        responses: [
            new OA\Response(response: 200, description: 'Cập nhật banner thành công')
        ]
    )]
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

    #[OA\Delete(
        path: '/api/admin/banners/{id}',
        summary: 'Xóa banner (Admin)',
        tags: ['Admin - Banners'],
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))
        ],
        responses: [
            new OA\Response(response: 200, description: 'Xóa banner thành công')
        ]
    )]
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

    #[OA\Patch(
        path: '/api/admin/banners/{id}/toggle',
        summary: 'Bật/Tắt trạng thái banner (Admin)',
        tags: ['Admin - Banners'],
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
