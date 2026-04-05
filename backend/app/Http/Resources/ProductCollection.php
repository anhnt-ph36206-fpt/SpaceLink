<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\ResourceCollection;

class ProductCollection extends ResourceCollection
{
    public function toArray(Request $request): array
    {
        return [
            'data' => $this->collection->map(function ($product) {
                $primaryImage = $product->images->firstWhere('is_primary', true) ?? $product->images->first();
                $imageUrl = $primaryImage?->image_url;

                return [
                    'id'          => $product->id,
                    'name'        => $product->name,
                    'slug'        => $product->slug,
                    'sku'         => $product->sku,
                    'price'       => $product->price,
                    'sale_price'  => $product->sale_price,
                    'quantity'    => $product->quantity,
                    'image'       => $imageUrl,
                    'images'      => $product->images->map(fn($img) => [
                        'id'         => $img->id,
                        'image_path' => $img->image_path,
                        'image_url'  => $img->image_url,
                        'is_primary' => $img->is_primary,
                    ]),
                    'category'    => $product->category ? [
                        'id'   => $product->category->id,
                        'name' => $product->category->name,
                    ] : null,
                    'brand'       => $product->brand ? [
                        'id'   => $product->brand->id,
                        'name' => $product->brand->name,
                    ] : null,
                 'is_featured' => $product->is_featured,
                    'is_active'   => $product->is_active,
                ];
            })->all()
        ];
    }
}
