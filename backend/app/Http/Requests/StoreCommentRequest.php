<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreCommentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return auth()->check();
    }

    public function rules(): array
    {
        return [
            'product_id' => ['required', 'integer', 'exists:products,id'],
            'content'    => ['required', 'string', 'min:2', 'max:2000'],
            'parent_id'  => ['nullable', 'integer', 'exists:comments,id'],
        ];
    }

    public function messages(): array
    {
        return [
            'product_id.required' => 'Vui lòng chọn sản phẩm.',
            'product_id.exists'   => 'Sản phẩm không tồn tại.',
            'content.required'    => 'Nội dung bình luận không được để trống.',
            'content.min'         => 'Bình luận phải có ít nhất 2 ký tự.',
            'content.max'         => 'Bình luận không được vượt quá 2000 ký tự.',
            'parent_id.exists'    => 'Bình luận gốc không tồn tại.',
        ];
    }
}
