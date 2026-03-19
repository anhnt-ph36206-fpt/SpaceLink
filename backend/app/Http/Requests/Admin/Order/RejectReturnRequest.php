<?php

namespace App\Http\Requests\Admin\Order;

use Illuminate\Foundation\Http\FormRequest;

class RejectReturnRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'reason_for_refusal' => 'required|string|max:500',
        ];
    }

    public function messages(): array
    {
        return [
            'reason_for_refusal.required' => 'Vui lòng nhập lý do từ chối hoàn trả.',
            'reason_for_refusal.string' => 'Lý do không hợp lệ.',
            'reason_for_refusal.max' => 'Lý do không được vượt quá 500 ký tự.',
        ];
    }
}
