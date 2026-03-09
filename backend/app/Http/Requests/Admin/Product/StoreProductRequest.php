<?php

namespace App\Http\Requests\Admin\Product;

use Illuminate\Foundation\Http\FormRequest;

class StoreProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Bảo vệ bởi middleware auth:sanctum + admin
    }

    public function rules(): array
    {
        return [
            // ── Product fields ──
            'category_id'      => 'required|integer|exists:categories,id',
            'brand_id'         => 'nullable|integer|exists:brands,id',
            'name'             => 'required|string|max:255',
            'slug'             => 'required|string|max:255|unique:products,slug',
            'sku'              => 'nullable|string|max:100|unique:products,sku',
            'price'            => 'required|numeric|min:0',
            'sale_price'       => 'nullable|numeric|min:0|lt:price',
            'quantity'         => 'nullable|integer|min:0',
            'description'      => 'nullable|string',
            'content'          => 'nullable|string',
            'is_featured'      => 'nullable|boolean',
            'is_active'        => 'nullable|boolean',
            'meta_title'       => 'nullable|string|max:255',
            'meta_description' => 'nullable|string',

            // ── Gallery images ──
            'images'                    => 'nullable|array',
            'images.*.file'             => 'required_with:images.*|image|max:10240',
            'images.*.is_primary'       => 'nullable', // Sẽ được filter_var trong controller
            'images.*.display_order'    => 'nullable|integer|min:0',

            // ── Variants ──
            'variants'                  => 'nullable|array',
            'variants.*.sku'            => 'nullable|string|max:100',
            'variants.*.price'          => 'required_with:variants.*|numeric|min:0',
            'variants.*.sale_price'     => 'nullable|numeric|min:0|lt:variants.*.price',
            'variants.*.quantity'       => 'required_with:variants.*|integer|min:0',
            'variants.*.is_active'      => 'nullable', // Sẽ được filter_var
            'variants.*.image'          => 'nullable|image|max:10240',
            'variants.*.attribute_ids'  => 'nullable|array',
            'variants.*.attribute_ids.*'=> 'integer|exists:attributes,id',
        ];
    }

    public function messages(): array
    {
        return [
            'category_id.required' => 'Danh mục không được để trống.',
            'category_id.exists'   => 'Danh mục không tồn tại.',
            'brand_id.exists'      => 'Thương hiệu không tồn tại.',
            'name.required'        => 'Tên sản phẩm không được để trống.',
            'slug.required'        => 'Slug không được để trống.',
            'slug.unique'          => 'Slug này đã tồn tại, vui lòng chọn slug khác.',
            'sku.unique'           => 'SKU này đã tồn tại.',
            'price.required'       => 'Giá sản phẩm không được để trống.',
            'price.min'            => 'Giá sản phẩm phải >= 0.',
            'sale_price.lt'        => 'Giá khuyến mãi phải nhỏ hơn giá gốc.',
            'images.*.file.image'  => 'File ảnh không hợp lệ.',
            'images.*.file.max'    => 'Ảnh không được vượt quá 10MB.',
            'variants.*.price.required_with' => 'Giá biến thể không được để trống.',
            'variants.*.image.image' => 'Ảnh biến thể không hợp lệ.',
            'variants.*.image.max'   => 'Ảnh biến thể không được vượt quá 10MB.',
        ];
    }
}
