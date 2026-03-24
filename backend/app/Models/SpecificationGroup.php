<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SpecificationGroup extends Model
{
    protected $fillable = ['name', 'display_order'];

    public function specifications()
    {
        return $this->hasMany(Specification::class);
    }
}
