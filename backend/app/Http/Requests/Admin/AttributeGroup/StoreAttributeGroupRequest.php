<?php

namespace App\Http\Requests\Admin\AttributeGroup;

use Illuminate\Foundation\Http\FormRequest;

class StoreAttributeGroupRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name'                     => 'required|string|max:255|unique:attribute_groups,name',
            'display_name'             => 'nullable|string|max:255',
            'display_order'            => 'nullable|integer|min:0',
            'attributes'               => 'nullable|array',
            'attributes.*.value'       => 'required_with:attributes|string|max:255',
            'attributes.*.color_code'  => 'nullable|string|max:20',
            'attributes.*.display_order'=> 'nullable|integer|min:0',
        ];
    }

    public function messages(): array
    {
        return [
            'name.required'              => 'Tên nhóm thuộc tính không được để trống.',
            'name.unique'                => 'Tên nhóm thuộc tính này đã tồn tại.',
            'attributes.*.value.required'=> 'Giá trị thuộc tính không được để trống.',
        ];
    }
}
