<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Attribute extends Model {
    use HasFactory;
    protected $fillable = ['attribute_group_id', 'value', 'color_code', 'display_order'];

    public function group() {
        return $this->belongsTo(AttributeGroup::class, 'attribute_group_id');
    }
}