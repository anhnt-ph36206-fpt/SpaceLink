<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'sku' => $this->sku,
            'description' => $this->description,
            'content' => $this->content,
            'price' => (float) $this->price,
            'sale_price' => $this->sale_price !== null ? (float) $this->sale_price : null,
            // effective_price: giá hiệu lực để frontend không phải tự tính COALESCE
            'effective_price' => (float) ($this->sale_price ?? $this->price),
            // quantity: ưu tiên tổng kho từ variants (chính xác), fallback product.quantity
            'quantity' => $this->relationLoaded('variants')
                ? $this->variants->sum('quantity')
                : $this->quantity,
            'sold_count' => (int) ($this->sold_count ?? 0),
            'view_count' => $this->view_count,
            'is_featured' => (bool) $this->is_featured,
            'is_active' => (bool) $this->is_active,
            'category' => $this->whenLoaded('category'),
            'brand' => $this->whenLoaded('brand'),
            'images' => $this->whenLoaded('images'),
            'variants' => $this->whenLoaded('variants', function () {
                return $this->variants->map(function ($variant) {
                    return [
                        'id' => $variant->id,
                        'sku' => $variant->sku,
                        'price' => $variant->price,
                        'sale_price' => $variant->sale_price,
                        'quantity' => $variant->quantity,
                        'sold_count' => (int) ($variant->sold_count ?? 0),
                        'image' => $variant->image,
                        'attributes' => $variant->attributes->map(function ($attr) {
                            return [
                                'id' => $attr->id,
                                'value' => $attr->value,
                                'color_code' => $attr->color_code,
                                'group' => $attr->attributeGroup ? $attr->attributeGroup->name : null,
                            ];
                        }),
                    ];
                });
            }),
            'specifications' => $this->whenLoaded('specifications', function () {
                return $this->specifications->map(function ($spec) {
                    return [
                        'id' => $spec->id,
                        'name' => $spec->name,
                        'value' => $spec->value,
                        'group' => $spec->specGroup ? [
                            'id' => $spec->specGroup->id,
                            'name' => $spec->specGroup->name,
                            'display_name' => $spec->specGroup->display_name,
                        ] : null,
                    ];
                });
            }),
            'created_at' => $this->created_at?->format('d-m-Y H:i:s'),
        ];
    }
}
