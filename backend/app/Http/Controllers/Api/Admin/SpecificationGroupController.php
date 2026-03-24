<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\SpecificationGroup;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SpecificationGroupController extends Controller
{
    public function index(Request $request)
    {
        $query = SpecificationGroup::query()->with(['specifications' => function ($q) {
            $q->orderBy('display_order')->orderBy('id');
        }]);

        if ($request->filled('search')) {
            $query->where('name', 'like', '%' . $request->search . '%');
        }

        $query->orderBy('display_order')->orderBy('id');

        if ($request->has('all')) {
            return response()->json(['data' => $query->get()]);
        }

        $perPage = (int) $request->get('per_page', 10);
        return response()->json($query->paginate($perPage));
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'name' => 'required|string|max:100',
            'display_order' => 'nullable|integer',
            'specifications' => 'nullable|array',
            'specifications.*.name' => 'required|string|max:255',
            'specifications.*.display_order' => 'nullable|integer',
        ]);

        DB::beginTransaction();
        try {
            $group = SpecificationGroup::create([
                'name' => $request->name,
                'display_order' => $request->display_order ?? 0
            ]);

            if ($request->has('specifications')) {
                foreach ($request->input('specifications') as $spec) {
                    $group->specifications()->create([
                        'name' => $spec['name'],
                        'display_order' => $spec['display_order'] ?? 0,
                    ]);
                }
            }

            DB::commit();

            return response()->json([
                'status'  => true,
                'message' => 'Tạo nhóm thông số kỹ thuật thành công.',
                'data'    => $group->load('specifications'),
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'status'  => false,
                'message' => 'Lỗi: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function show(string $id): JsonResponse
    {
        $group = SpecificationGroup::with(['specifications' => function ($q) {
            $q->orderBy('display_order')->orderBy('id');
        }])->findOrFail($id);

        return response()->json([
            'status' => true,
            'data'   => $group,
        ]);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $group = SpecificationGroup::findOrFail($id);

        $request->validate([
            'name' => 'required|string|max:100',
            'display_order' => 'nullable|integer',
            'specifications' => 'nullable|array',
            'specifications.*.id' => 'nullable|exists:specifications,id',
            'specifications.*.name' => 'required|string|max:255',
            'specifications.*.display_order' => 'nullable|integer',
        ]);

        DB::beginTransaction();
        try {
            $group->update([
                'name' => $request->name,
                'display_order' => $request->display_order ?? 0
            ]);

            if ($request->has('specifications') && is_array($request->specifications)) {
                $incomingSpecs = $request->specifications;
                $incomingResourceIds = collect($incomingSpecs)->pluck('id')->filter()->all();

                $group->specifications()->whereNotIn('id', $incomingResourceIds)->delete();

                foreach ($incomingSpecs as $spec) {
                    if (isset($spec['id'])) {
                        $group->specifications()->where('id', $spec['id'])->update([
                            'name' => $spec['name'],
                            'display_order' => $spec['display_order'] ?? 0,
                        ]);
                    } else {
                        $group->specifications()->create([
                            'name' => $spec['name'],
                            'display_order' => $spec['display_order'] ?? 0,
                        ]);
                    }
                }
            } else {
                $group->specifications()->delete();
            }

            DB::commit();

            return response()->json([
                'status'  => true,
                'message' => 'Cập nhật thành công.',
                'data'    => $group->load(['specifications' => function ($q) {
                    $q->orderBy('display_order')->orderBy('id');
                }]),
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'status'  => false,
                'message' => 'Lỗi: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function destroy(string $id): JsonResponse
    {
        $group = SpecificationGroup::findOrFail($id);
        $group->delete();

        return response()->json([
            'status'  => true,
            'message' => 'Xóa thành công.',
        ]);
    }
}
