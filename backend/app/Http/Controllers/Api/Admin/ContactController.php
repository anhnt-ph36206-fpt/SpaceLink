<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Contact;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class ContactController extends Controller
{
    /**
     * GET /api/admin/contacts
     * List all contacts
     */
    public function index(Request $request)
    {
        $query = Contact::query();

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('search')) {
            $keyword = $request->search;
            $query->where(function($q) use ($keyword) {
                $q->where('fullname', 'like', "%{$keyword}%")
                  ->orWhere('email', 'like', "%{$keyword}%")
                  ->orWhere('subject', 'like', "%{$keyword}%");
            });
        }

        $contacts = $query->latest()->paginate(15);

        return response()->json([
            'status' => 'success',
            'data'   => $contacts
        ]);
    }

    /**
     * PATCH /api/admin/contacts/{id}/reply
     * Admin reply to a contact
     */
    public function reply(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'reply_content' => 'required|string|max:2000',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Nội dung phản hồi không hợp lệ.',
                'errors'  => $validator->errors()
            ], 422);
        }

        try {
            $contact = Contact::findOrFail($id);
            $contact->update([
                'reply_content' => $request->reply_content,
                'replied_by'    => $request->user()->id,
                'replied_at'    => now(),
                'status'        => 'replied',
            ]);

            // Logic: Send email to customer (optional, depending on project requirement)

            return response()->json([
                'status'  => 'success',
                'message' => 'Đã gửi phản hồi cho khách hàng.',
                'data'    => $contact
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Lỗi khi lưu phản hồi.',
                'error'   => $e->getMessage()
            ], 500);
        }
    }

    /**
     * DELETE /api/admin/contacts/{id}
     */
    public function destroy($id)
    {
        try {
            $contact = Contact::findOrFail($id);
            $contact->delete();

            return response()->json([
                'status'  => 'success',
                'message' => 'Đã xóa liên hệ.'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Lỗi khi xóa liên hệ.'
            ], 500);
        }
    }
}
