<?php

namespace App\Http\Requests\Admin\Product;

use Illuminate\Foundation\Http\FormRequest;

class UpdateProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        // Lấy {product} từ route để ignore unique constraint chính nó
        $id = $this->route('product');

        return [
            'category_id'      => 'required|integer|exists:categories,id',
            'brand_id'         => 'nullable|integer|exists:brands,id',
            'name'             => 'required|string|max:255',
            'slug'             => "required|string|max:255|unique:products,slug,{$id}",
            'sku'              => "nullable|string|max:100|unique:products,sku,{$id}",
            'price'            => 'required|numeric|min:0',
            'sale_price'       => 'nullable|numeric|min:0|lt:price',
            'quantity'         => 'nullable|integer|min:0',
            'description'      => 'nullable|string',
            'content'          => 'nullable|string',
            'is_featured'      => 'nullable|boolean',
            'is_active'        => 'nullable|boolean',
            'meta_title'       => 'nullable|string|max:255',
            'meta_description' => 'nullable|string',
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
            'sale_price.lt'        => 'Giá khuyến mãi phải nhỏ hơn giá gốc.',
        ];
    }
}
