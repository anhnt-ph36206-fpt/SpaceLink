<?php

namespace App\Http\Controllers\Api\Client;

use App\Http\Controllers\Controller;
use App\Http\Requests\SearchRequest;
use App\Models\News;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class SearchController extends Controller
{
    /**
     * GET /api/search
     * Tìm kiếm sản phẩm và/hoặc tin tức theo từ khóa.
     */
    public function __invoke(SearchRequest $request)
    {
        $q       = $request->q;
        $type    = $request->input('type', 'all');
        $perPage = (int) $request->input('per_page', 12);

        $result = [];

        // ── Tìm kiếm Sản phẩm ────────────────────────────────────────────
        if (in_array($type, ['all', 'products'])) {
            $productQuery = Product::search($q)
                ->query(function ($builder) use ($request) {
                    $builder->with(['category:id,name,slug', 'brand:id,name', 'images'])
                        ->where('is_active', true);

                    // Lọc theo danh mục
                    if ($request->filled('category_id')) {
                        $builder->where('category_id', $request->category_id);
                    }

                    // Lọc theo thương hiệu
                    if ($request->filled('brand_id')) {
                        $builder->where('brand_id', $request->brand_id);
                    }

                    // Lọc theo khoảng giá (dùng giá hiệu lực)
                    if ($request->filled('min_price')) {
                        $builder->whereRaw('COALESCE(sale_price, price) >= ?', [$request->min_price]);
                    }
                    if ($request->filled('max_price')) {
                        $builder->whereRaw('COALESCE(sale_price, price) <= ?', [$request->max_price]);
                    }

                    // Sắp xếp
                    match ($request->input('sort_by', 'latest')) {
                        'price_asc'  => $builder->orderBy('price', 'asc'),
                        'price_desc' => $builder->orderBy('price', 'desc'),
                        default      => $builder->latest(),
                    };
                });

            $products = $productQuery->paginate($perPage);

            $result['products'] = [
                'data'         => $products->map(fn ($p) => $this->formatProduct($p)),
                'total'        => $products->total(),
                'per_page'     => $products->perPage(),
                'current_page' => $products->currentPage(),
                'last_page'    => $products->lastPage(),
            ];
        }

        // ── Tìm kiếm Tin tức ─────────────────────────────────────────────
        if (in_array($type, ['all', 'news'])) {
            $news = News::search($q)
                ->query(fn ($b) => $b->with('author:id,fullname')
                    ->where('is_active', true)
                    ->latest('published_at')
                )
                ->paginate($perPage);

            $result['news'] = [
                'data'         => $news->items(),
                'total'        => $news->total(),
                'per_page'     => $news->perPage(),
                'current_page' => $news->currentPage(),
                'last_page'    => $news->lastPage(),
            ];
        }

        return response()->json([
            'status' => 'success',
            'query'  => $q,
            'type'   => $type,
            'data'   => $result,
        ]);
    }

    /**
     * GET /api/search/autocomplete?q=...
     * Gợi ý tìm kiếm nhanh — tối đa 8 sản phẩm, cache 5 phút.
     */
    public function autocomplete(Request $request)
    {
        $q = trim((string) $request->query('q', ''));

        if (mb_strlen($q) < 2) {
            return response()->json([]);
        }

        $suggestions = Cache::remember("autocomplete:{$q}", 300, function () use ($q) {
            return Product::search($q)
                ->query(fn ($b) => $b
                    ->where('is_active', true)
                    ->with('images')
                    ->select(['id', 'name', 'slug', 'price', 'sale_price'])
                )
                ->take(8)
                ->get()
                ->map(fn ($p) => [
                    'id'            => $p->id,
                    'name'          => $p->name,
                    'slug'          => $p->slug,
                    'price'         => $p->price,
                    'sale_price'    => $p->sale_price,
                    'thumbnail_url' => ($p->images->where('is_primary', true)->first()
                        ?? $p->images->first())?->image_url,
                ]);
        });

        return response()->json([
            'status' => 'success',
            'query'  => $q,
            'data'   => $suggestions,
        ]);
    }

    /**
     * Format product để trả về dữ liệu gọn đủ dùng cho FE search results.
     */
    private function formatProduct(Product $product): array
    {
        $thumbnail = $product->images->where('is_primary', true)->first()
            ?? $product->images->first();

        return [
            'id'            => $product->id,
            'name'          => $product->name,
            'slug'          => $product->slug,
            'sku'           => $product->sku,
            'price'         => $product->price,
            'sale_price'    => $product->sale_price,
            'sale_end'      => $product->sale_end,
            'thumbnail_url' => $thumbnail?->image_url ?? null,
            'category'      => $product->category ? [
                'id'   => $product->category->id,
                'name' => $product->category->name,
                'slug' => $product->category->slug,
            ] : null,
            'brand' => $product->brand ? [
                'id'   => $product->brand->id,
                'name' => $product->brand->name,
            ] : null,
        ];
    }
}

