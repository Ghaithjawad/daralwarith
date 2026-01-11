/* ================== CONFIG ================== */
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwY8HAzvz8Nz1PO-Jeu48AYyDSXFXLcjHhhZeg6VY7442qynpYaKAEkPbY3fbp5YoU_/exec";

/* ================== DOM ================== */
const loginPage = document.getElementById("loginPage");
const formPage  = document.getElementById("formPage");

const loginNameEl = document.getElementById("loginName");
const loginIdEl   = document.getElementById("loginId");
const loginError  = document.getElementById("loginError");
const loginDone   = document.getElementById("loginDone");
const btnLogin    = document.getElementById("btnLogin");
const btnLogout   = document.getElementById("btnLogout");
const whoUser     = document.getElementById("whoUser");

const sheetStatus = document.getElementById("sheetStatus");
const progressWrap = document.getElementById("progressWrap");
const progressText = document.getElementById("progressText");
const progressBar  = document.getElementById("progressBar");

const employeeName = document.getElementById("employeeName");
const birthPlace   = document.getElementById("birthPlace");
const birthDate    = document.getElementById("birthDate");
const phone        = document.getElementById("phone");
const badgeNumber  = document.getElementById("badgeNumber");
const education    = document.getElementById("education");
const specialty    = document.getElementById("specialty");
const address      = document.getElementById("address");
const nameError    = document.getElementById("nameError");

const empFace = document.getElementById("empFace");
const empBack = document.getElementById("empBack");
const empFacePreview = document.getElementById("empFacePreview");
const empBackPreview = document.getElementById("empBackPreview");

const submitBtn = document.getElementById("submitBtn");

/* ================== HELPERS ================== */
function bindPreview(input, img){
  if(!input || !img) return;
  input.addEventListener("change", ()=>{
    if(input.files && input.files[0]){
      img.src = URL.createObjectURL(input.files[0]);
      img.classList.remove("d-none");
    }
  });
}
bindPreview(empFace, empFacePreview);
bindPreview(empBack, empBackPreview);

function showStatus(type, msg){
  sheetStatus.className = "alert " + type;
  sheetStatus.textContent = msg;
  sheetStatus.classList.remove("d-none");
}
function setProgress(on, pct, msg){
  progressWrap.classList.toggle("show", !!on);
  progressBar.style.width = (pct||0) + "%";
  progressText.textContent = msg || "";
}

function isQuadName(v){
  return v.trim().split(/\s+/).filter(Boolean).length === 4;
}

employeeName.addEventListener("input", ()=>{
  const v = employeeName.value.trim();
  nameError.classList.toggle("show", v && !isQuadName(v));
});

/* ================== LOGIN ================== */
async function doLogin(){
  loginError.classList.add("d-none");
  loginDone.classList.add("d-none");

  const name = loginNameEl.value.trim();
  const id   = loginIdEl.value.trim();
  if(!name || !id){
    loginError.textContent = "يرجى إدخال الاسم والـ ID";
    loginError.classList.remove("d-none");
    return;
  }

  const body = new URLSearchParams();
  body.set("action","login");
  body.set("name", name);
  body.set("id", id);

  const res = await fetch(SCRIPT_URL, { method:"POST", body });
  const txt = (await res.text()).trim();

  if(txt === "OK"){
    localStorage.setItem("dar_login_id", id);
    localStorage.setItem("dar_login_name", name);
    loginPage.classList.add("d-none");
    formPage.classList.remove("d-none");
    whoUser.textContent = `${name} — ID: ${id}`;
  }else if(txt === "DONE"){
    loginDone.classList.remove("d-none");
  }else{
    loginError.textContent = "الاسم أو الـ ID غير صحيح";
    loginError.classList.remove("d-none");
  }
}
btnLogin.addEventListener("click", doLogin);

btnLogout.addEventListener("click", ()=>{
  localStorage.clear();
  location.reload();
});

/* ================== PDF ================== */
const { jsPDF } = window.jspdf;
const CM = 28.35;

async function loadImage(file){
  return new Promise((res,rej)=>{
    const r = new FileReader();
    r.onload = e => res(e.target.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

async function buildPDF(){
  const pdf = new jsPDF({unit:"px", format:"a4"});

  pdf.setFontSize(16);
  pdf.text("بيانات الموظف", 300, 40, {align:"center"});

  pdf.setFontSize(12);
  let y = 80;
  const lines = [
    `الاسم: ${employeeName.value}`,
    `محل الولادة: ${birthPlace.value}`,
    `المواليد: ${birthDate.value}`,
    `الهاتف: ${phone.value}`,
    `رقم الباج: ${badgeNumber.value}`,
    `التحصيل الدراسي: ${education.value}`,
    `التخصص: ${specialty.value}`,
    `العنوان: ${address.value}`
  ];
  lines.forEach(t=>{
    pdf.text(t, 60, y);
    y += 24;
  });

  // بطاقة وطنية
  if(empFace.files[0] && empBack.files[0]){
    pdf.addPage();
    const face = await loadImage(empFace.files[0]);
    const back = await loadImage(empBack.files[0]);
    pdf.text("البطاقة الوطنية", 300, 40, {align:"center"});
    pdf.addImage(face, "JPEG", 60, 80, 220, 140);
    pdf.addImage(back, "JPEG", 320, 80, 220, 140);
  }

  if(pdf.getNumberOfPages() > 1) pdf.deletePage(1);
  return pdf;
}

/* ================== SUBMIT ================== */
async function submitAll(){
  const loginId = localStorage.getItem("dar_login_id");
  const loginName = localStorage.getItem("dar_login_name");
  if(!loginId || !loginName){
    alert("يرجى تسجيل الدخول");
    return;
  }

  if(!employeeName.value.trim()){
    alert("ادخل الاسم الرباعي");
    return;
  }
  if(!isQuadName(employeeName.value)){
    alert("الاسم يجب أن يكون رباعي");
    return;
  }
  if(!empFace.files[0] || !empBack.files[0]){
    alert("ارفع وجه وظهر البطاقة الوطنية");
    return;
  }

  submitBtn.disabled = true;
  setProgress(true, 10, "جاري إنشاء PDF...");

  try{
    const pdf = await buildPDF();
    const pdfBase64 = btoa(pdf.output("arraybuffer")
      .reduce((d,byte)=>d+String.fromCharCode(byte),""));

    setProgress(true, 70, "إرسال البيانات...");

    const body = new URLSearchParams();
    body.set("action","submitForm");
    body.set("loginId", loginId);
    body.set("loginName", loginName);
    body.set("employeeName", employeeName.value);
    body.set("birthPlace", birthPlace.value);
    body.set("birthDate", birthDate.value);
    body.set("phone", phone.value);
    body.set("badgeNumber", badgeNumber.value);
    body.set("education", education.value);
    body.set("specialty", specialty.value);
    body.set("address", address.value);
    body.set("pdfBase64", pdfBase64);
    body.set("pdfFileName", employeeName.value.replace(/\s+/g,"_")+".pdf");

    const res = await fetch(SCRIPT_URL, { method:"POST", body });
    const txt = (await res.text()).trim();

    if(txt === "OK"){
      setProgress(true, 100, "تم الرفع");
      showStatus("alert-success","تم الرفع بنجاح ✅");
      alert("تم الرفع بنجاح، لا يمكن الإرسال مرة أخرى");
    }else{
      showStatus("alert-danger", txt);
      submitBtn.disabled = false;
    }

  }catch(e){
    console.error(e);
    showStatus("alert-danger","صار خطأ أثناء الإرسال");
    submitBtn.disabled = false;
  }
}

submitBtn.addEventListener("click", submitAll);

/* ================== INIT ================== */
(function init(){
  const id = localStorage.getItem("dar_login_id");
  const name = localStorage.getItem("dar_login_name");
  if(id && name){
    loginPage.classList.add("d-none");
    formPage.classList.remove("d-none");
    whoUser.textContent = `${name} — ID: ${id}`;
  }
})();
