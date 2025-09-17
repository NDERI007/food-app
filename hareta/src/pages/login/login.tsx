import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { toast } from "sonner";
//import { login } from "../services/auth";
import { loginSchema, type LoginSchemaType } from "../../utils/schemas/auth";

export default function Login() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginSchemaType>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginSchemaType) => {
    try {
      //await //login(data);
      toast.success("Login successful!");
    } catch (error: any) {
      toast.error(error.message || "Login failed");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-green-50">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md"
      >
        <h2 className="text-2xl font-bold mb-6 text-center text-green-900">
          Login
        </h2>

        <div className="flex flex-col mb-4">
          <label className="mb-1 font-medium">Email</label>
          <input
            type="email"
            placeholder="you@example.com"
            {...register("email")}
            className={`border rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-green-600 ${
              errors.email ? "border-red-500" : "border-gray-300"
            }`}
          />
          {errors.email && (
            <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
          )}
        </div>

        <div className="flex flex-col mb-4">
          <label className="mb-1 font-medium">Password</label>
          <input
            type="password"
            placeholder="••••••••"
            {...register("password")}
            className={`border rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-green-600 ${
              errors.password ? "border-red-500" : "border-gray-300"
            }`}
          />
          {errors.password && (
            <p className="text-red-500 text-sm mt-1">
              {errors.password.message}
            </p>
          )}
        </div>

        <button
          type="submit"
          className="w-full bg-green-900 text-white py-2 px-4 rounded-md hover:bg-green-800 transition-colors"
        >
          Login
        </button>

        <p className="text-sm text-gray-500 mt-4 text-center">
          Don't have an account?{" "}
          <a href="/register" className="text-green-700 underline">
            Sign up
          </a>
        </p>
      </form>
    </div>
  );
}
