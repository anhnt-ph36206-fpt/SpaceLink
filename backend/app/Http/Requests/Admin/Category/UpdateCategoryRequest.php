<?php

namespace App\Http\Requests\Admin\Category;

use Illuminate\Foundation\Http\FormRequest;

class UpdateCategoryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Đã được bảo vệ bởi middleware auth:sanctum + admin
    }

    public function rules(): array
    {
        // Lấy {id} từ route để bỏ qua slug của chính record đang cập nhật
        $id = $this->route('category');

        return [
            'name'          => 'required|string|max:255',
            'slug'          => "required|string|max:255|unique:categories,slug,{$id}",
            'parent_id'     => 'nullable|integer|exists:categories,id',
            'image'         => 'nullable|string|max:255',
            'icon'          => 'nullable|string|max:100',
            'description'   => 'nullable|string',
            'display_order' => 'nullable|integer|min:0',
            'is_active'     => 'nullable|boolean',
        ];
    }

    public function messages(): array
    {
        return [
            'name.required'     => 'Tên danh mục không được để trống.',
            'slug.required'     => 'Slug không được để trống.',
            'slug.unique'       => 'Slug này đã tồn tại, vui lòng chọn slug khác.',
            'parent_id.exists'  => 'Danh mục cha không tồn tại.',
            'display_order.min' => 'Thứ tự hiển thị phải >= 0.',
        ];
    }
}
