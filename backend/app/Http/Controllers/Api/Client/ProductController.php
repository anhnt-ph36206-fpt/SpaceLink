<?php

namespace App\Http\Controllers\Api\Client;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Http\Resources\ProductResource;
use App\Http\Resources\ProductCollection;
use Illuminate\Http\Request;

class ProductController extends Controller
{    public function index(Request $request)
    {
        $query = Product::with(['category', 'brand', 'images', 'variants.attributes.attributeGroup'])
            ->where('is_active', true);

        // Lọc theo danh mục
        if ($request->filled('category_id')) {
            $query->where('category_id', $request->category_id);
        }

        // Lọc theo thương hiệu
        if ($request->filled('brand_id')) {
            $query->where('brand_id', $request->brand_id);
        }

        // Tìm kiếm theo tên
        if ($request->filled('keyword')) {
            $keyword = $request->keyword;
            $query->where('name', 'like', "%{$keyword}%");
        }

        // Lọc theo khoảng giá (dùng giá hiệu lực = COALESCE(sale_price, price))
        if ($request->filled('min_price')) {
            $query->where(function ($q) use ($request) {
                $q->whereRaw('COALESCE(sale_price, price) >= ?', [$request->min_price]);
            });
        }
        if ($request->filled('max_price')) {
            $query->where(function ($q) use ($request) {
                $q->whereRaw('COALESCE(sale_price, price) <= ?', [$request->max_price]);
            });
        }

        // Sắp xếp
        if ($request->has('sort_by')) {
            switch ($request->sort_by) {
                case 'price_asc':
                    $query->orderBy('price', 'asc');
                    break;
                case 'price_desc':
                    $query->orderBy('price', 'desc');
                    break;
                case 'latest':
                    $query->latest();
                    break;
                case 'oldest':
                    $query->oldest();
                    break;
                case 'view_count':
                    $query->orderBy('view_count', 'desc');
                    break;
                default:
                    $query->latest();
                    break;
            }
        } else {
            $query->latest();
        }

        $products = $query->paginate(12);

        return new ProductCollection($products);
    }    public function show($id)
    {
        // Eager Loading sâu để lấy: Variants -> Attributes -> AttributeGroup
        $product = Product::with([
            'category',
            'brand',
            'images',
            'variants' => function ($q) {
                $q->where('is_active', true); // Chỉ lấy variant đang bán
            },
            'variants.attributes.attributeGroup',
        ])
        ->where('is_active', true)  // Không lấy sản phẩm đã ẩn
        ->find($id);

        if (!$product) {
            return response()->json(['message' => 'Không tìm thấy sản phẩm.'], 404);
        }

        // Tăng lượt xem
        $product->increment('view_count');

        return new ProductResource($product);
    }
}