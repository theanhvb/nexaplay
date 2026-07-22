import { FormEvent, useState } from "react";
import { ArrowLeft, X } from "lucide-react";
import { api } from "../services/api";

type Props={onClose:()=>void;onLogin:(email:string,password:string)=>Promise<void>;onRegister:(email:string,password:string,displayName:string)=>Promise<void>};
type Mode="login"|"register"|"forgot"|"reset";

export function LoginModal({onClose,onLogin,onRegister}:Props){
  const[mode,setMode]=useState<Mode>("login"),[email,setEmail]=useState(""),[password,setPassword]=useState(""),[confirmPassword,setConfirmPassword]=useState(""),[displayName,setDisplayName]=useState(""),[resetToken,setResetToken]=useState(""),[error,setError]=useState(""),[notice,setNotice]=useState(""),[loading,setLoading]=useState(false);
  const changeMode=(next:Mode)=>{setMode(next);setError("");setNotice("");setPassword("");setConfirmPassword("")};
  async function submit(event:FormEvent){event.preventDefault();setLoading(true);setError("");setNotice("");try{
    if(mode==="login"){await onLogin(email,password);onClose();return}
    if(mode==="register"){if(password!==confirmPassword)throw new Error("Mật khẩu xác nhận không khớp");await onRegister(email,password,displayName);onClose();return}
    if(mode==="forgot"){const result=await api.forgotPassword(email);setNotice("Nếu email tồn tại, hướng dẫn đặt lại mật khẩu đã được tạo.");if(result.devResetToken){setResetToken(result.devResetToken);setMode("reset")}return}
    if(password!==confirmPassword)throw new Error("Mật khẩu xác nhận không khớp");await api.resetPassword(resetToken,password);setNotice("Đặt lại mật khẩu thành công. Bạn có thể đăng nhập.");setMode("login");setResetToken("");
  }catch(err){setError(err instanceof Error?err.message:"Thao tác thất bại")}finally{setLoading(false)}}
  return <div className="modal-shell" role="dialog" aria-modal="true"><form className="auth-modal auth-service-modal" onSubmit={submit}>
    <button className="icon-button auth-modal__close" type="button" onClick={onClose} aria-label="Đóng"><X size={20}/></button>
    {mode==="forgot"||mode==="reset"?<button type="button" className="auth-back" onClick={()=>changeMode("login")}><ArrowLeft/>Quay lại đăng nhập</button>:<div className="auth-tabs"><button type="button" className={mode==="login"?"active":""} onClick={()=>changeMode("login")}>Đăng nhập</button><button type="button" className={mode==="register"?"active":""} onClick={()=>changeMode("register")}>Đăng ký</button></div>}
    <span className="eyebrow">NexaPlay Account</span><h2>{mode==="login"?"Chào mừng trở lại":mode==="register"?"Tạo tài khoản":mode==="forgot"?"Quên mật khẩu":"Đặt lại mật khẩu"}</h2>
    {mode==="register"&&<label>Tên hiển thị<input value={displayName} onChange={e=>setDisplayName(e.target.value)} required minLength={2} maxLength={80} autoComplete="name"/></label>}
    {mode!=="reset"&&<label>Email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required autoComplete="email" placeholder="you@example.com"/></label>}
    {mode==="reset"&&<label>Mã đặt lại<input value={resetToken} onChange={e=>setResetToken(e.target.value)} required minLength={20}/></label>}
    {(mode==="login"||mode==="register"||mode==="reset")&&<label>{mode==="reset"?"Mật khẩu mới":"Mật khẩu"}<input type="password" value={password} onChange={e=>setPassword(e.target.value)} required minLength={mode==="login"?1:10} maxLength={128} autoComplete={mode==="login"?"current-password":"new-password"}/></label>}
    {(mode==="register"||mode==="reset")&&<label>Xác nhận mật khẩu<input type="password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} required minLength={10} autoComplete="new-password"/></label>}
    {mode==="login"&&<button type="button" className="forgot-link" onClick={()=>changeMode("forgot")}>Quên mật khẩu?</button>}
    {mode==="forgot"&&<p className="muted">Nhập email tài khoản. Liên kết đặt lại có hiệu lực trong 30 phút.</p>}
    {error&&<p className="form-error">{error}</p>}{notice&&<p className="form-success">{notice}</p>}
    <button className="primary-button auth-submit" disabled={loading}>{loading?"Đang xử lý...":mode==="login"?"Đăng nhập":mode==="register"?"Tạo tài khoản":mode==="forgot"?"Gửi hướng dẫn":"Đặt lại mật khẩu"}</button>
  </form></div>
}
