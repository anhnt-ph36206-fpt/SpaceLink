<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Specification extends Model
{
    protected $fillable = ['specification_group_id', 'name', 'display_order'];

    public function group()
    {
        return $this->belongsTo(SpecificationGroup::class, 'specification_group_id');
    }

    public function products()
    {
        return $this->belongsToMany(Product::class, 'product_specifications')
                    ->withPivot('value');
    }
}
