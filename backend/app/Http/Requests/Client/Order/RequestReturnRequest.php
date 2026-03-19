<?php

namespace App\Http\Requests\Client\Order;

use Illuminate\Foundation\Http\FormRequest;

class RequestReturnRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'reason' => 'required|string|max:500',
            'evidence_images' => 'required|array|min:1|max:5',
            'evidence_images.*' => 'file|mimes:jpeg,png,jpg,gif,webp|max:5120',
        ];
    }

    public function messages(): array
    {
        return [
            'reason.required' => 'Vui lòng nhập lý do yêu cầu hoàn trả.',
            'reason.string' => 'Lý do không hợp lệ.',
            'reason.max' => 'Lý do không được vượt quá 500 ký tự.',
            'evidence_images.required' => 'Vui lòng chọn ít nhất 1 hình ảnh minh chứng.',
            'evidence_images.array' => 'Danh sách hình ảnh minh chứng không hợp lệ.',
            'evidence_images.min' => 'Vui lòng chọn ít nhất 1 hình ảnh minh chứng.',
            'evidence_images.max' => 'Vui lòng chọn tối đa 5 hình ảnh minh chứng.',
            'evidence_images.*.mimes' => 'Hình ảnh minh chứng không đúng định dạng.',
            'evidence_images.*.max' => 'Hình ảnh minh chứng không được vượt quá 5MB mỗi tệp.',
        ];
    }
}
