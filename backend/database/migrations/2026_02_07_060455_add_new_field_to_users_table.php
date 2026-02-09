<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Thêm các cột mới (chỉ thêm cột chưa có)
            $table->unsignedBigInteger('role_id')->default(3)->after('id');
            $table->renameColumn('name', 'fullname'); // Đổi tên cột name -> fullname
            $table->string('phone', 15)->nullable()->after('fullname');
            $table->string('avatar', 255)->nullable()->after('phone');
            $table->date('date_of_birth')->nullable()->after('avatar');
            $table->enum('gender', ['male', 'female', 'other'])->nullable()->after('date_of_birth');
            $table->enum('status', ['active', 'inactive', 'banned'])->default('active')->after('email_verified_at');
            $table->timestamp('last_login_at')->nullable()->after('remember_token');
            $table->softDeletes();

            // Thêm foreign key và indexes
            $table->foreign('role_id')->references('id')->on('roles')->restrictOnDelete();
            $table->index('role_id', 'idx_role');
            $table->index('email', 'idx_email');
            $table->index('status', 'idx_status');
            $table->index('deleted_at', 'idx_deleted');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Xóa foreign key trước (QUAN TRỌNG: phải xóa FK trước khi xóa index)
            $table->dropForeign(['role_id']);
            
            // Sau đó mới xóa indexes
            $table->dropIndex('idx_role');
            $table->dropIndex('idx_email');
            $table->dropIndex('idx_status');
            $table->dropIndex('idx_deleted');

            // Xóa các cột đã thêm
            $table->dropColumn([
                'role_id',
                'phone',
                'avatar',
                'date_of_birth',
                'gender',
                'status',
                'last_login_at',
                'deleted_at',
            ]);
            $table->renameColumn('fullname', 'name'); // Đổi lại tên
        });
    }
};
