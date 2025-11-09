import { useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";

const ClaimConfirmationPage = () => {
  const { code } = useParams();
  const [searchParams] = useSearchParams();
  const action = searchParams.get("action");
  console.log(code);

  useEffect(() => {
    const sendResponse = async () => {
      try {
        const res = await axios.get(
          `${
            import.meta.env.VITE_WARRANTY_API
          }/claims/${code}/customer-response?action=${action}`
        );
        toast.success("Phản hồi đã được ghi nhận!");
      } catch (error) {
        toast.error("Có lỗi xảy ra, vui lòng thử lại.");
      }
    };

    if (action) sendResponse();
  }, [code, action]);

  return (
    <div className="flex justify-center items-center h-screen w-full">
      <p className="text-lg font-semibold text-center w-full">
        Cảm ơn bạn đã phản hồi!
      </p>
    </div>
  );
};

export default ClaimConfirmationPage;
