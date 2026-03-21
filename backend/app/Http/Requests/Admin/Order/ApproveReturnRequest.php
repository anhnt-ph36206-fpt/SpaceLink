<?php

namespace App\Http\Requests\Admin\Order;

use Illuminate\Foundation\Http\FormRequest;

class ApproveReturnRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'admin_note' => 'nullable|string|max:500',
        ];
    }

    public function messages(): array
    {
        return [
            'admin_note.string' => 'Ghi chú không hợp lệ.',
            'admin_note.max' => 'Ghi chú không được vượt quá 500 ký tự.',
        ];
    }
}
