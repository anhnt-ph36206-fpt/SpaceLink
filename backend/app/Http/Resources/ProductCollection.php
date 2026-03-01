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
                return [
                    'id' => $product->id,
                    'name' => $product->name,
                    'slug' => $product->slug,
                    'price' => $product->price,
                    'sale_price' => $product->sale_price,
                    'image' => $product->images->first()->image_url ?? null, // Assuming image_url accessor or column
                    'category' => $product->category ? $product->category->name : null,
                    'brand' => $product->brand ? $product->brand->name : null,
                    'is_featured' => $product->is_featured,
                ];
            }),
            'links' => [
                'self' => 'link-value',
            ],
        ];
    }
}
