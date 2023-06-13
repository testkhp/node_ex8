const express = require("express");
const multer  = require('multer'); //파일업로드 기능 multer 사용하기 위한 불러오기
const MongoClient = require("mongodb").MongoClient;
//데이터베이스의 데이터 입력,출력을 위한 함수명령어 불러들이는 작업
const app = express();
const port = 8000;

//ejs 태그를 사용하기 위한 세팅
app.set("view engine","ejs");
//사용자가 입력한 데이터값을 주소로 통해서 전달되는 것을 변환(parsing)
app.use(express.urlencoded({extended: true}));
app.use(express.json()) 
//css/img/js(정적인 파일)사용하려면 이코드를 작성!
app.use(express.static('public'));


let db; //데이터베이스 연결을 위한 변수세팅(변수의 이름은 자유롭게 지어도 됨)

MongoClient.connect("mongodb+srv://khp2337:cogktkfkd8214@cluster0.kjr1egt.mongodb.net/?retryWrites=true&w=majority",function(err,result){
    //에러가 발생했을경우 메세지 출력(선택사항)
    if(err) { return console.log(err); }

    //위에서 만든 db변수에 최종연결 ()안에는 mongodb atlas 사이트에서 생성한 데이터베이스 이름
    db = result.db("fileup");

    //db연결이 제대로 됬다면 서버실행
    app.listen(port,function(){
        console.log("서버연결 성공");
    });

});

app.get("/",function(req,res){
    res.render("index.ejs");
});

//게시글 목록 페이지
app.get("/board/list",(req,res)=>{
   db.collection("product").find().sort({num:-1}).toArray((err,result)=>{
        //게시글 목록 데이터 전부 가지고 와서 목록페이지로 전달
        res.render("brd_list.ejs",{data:result})
   })
})

//게시글 작성화면 페이지
app.get("/board/insert",(req,res)=>{
    res.render("brd_insert.ejs");
})


//파일 첨부후 서버에 전달 할 때 multer library 설정
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'public/upload') //업로드 폴더 지정
    },
    filename: function (req, file, cb) {
      cb(null, file.originalname = Buffer.from(file.originalname, 'latin1').toString('utf8'))
      //영어가 아닌 다른 파일명 안깨지고 나오게 처리
    }
  })
  
const upload = multer({ storage: storage })
//upload는 위의 설정사항을 담은 변수(상수) 



//게시글 데이터베이스에 등록처리(파일첨부 배우면서 코드 수정)
                        //input type="file" name="thumbnail" <--- 이값을 기입
app.post("/dbupload",upload.single("thumbnail"),(req,res)=>{
    
    // console.log(req.file) 파일정보들 확인 

    db.collection("count").findOne({name:"상품갯수"},(err,countResult)=>{
        db.collection("product").insertOne({
            num:countResult.prdCount,
            title:req.body.title,
            author:req.body.author,
            attachfile:req.file.filename,
        },(err,result)=>{
            db.collection("count").updateOne({name:"상품갯수"},{$inc:{prdCount:1}},(err,result)=>{
                res.redirect(`/board/detail/${countResult.prdCount}`)
            })
        })
    })
})


//게시글 상세화면페이지
app.get("/board/detail/:num",(req,res)=>{

    db.collection("product").findOne({num:Number(req.params.num)},(err,result)=>{
        //find로 찾아온 데이터값은 result에 담긴다
        //상세페이지 보여주기위해서 찾은 데이터값을 함께 전달한다.
        res.render("brd_detail.ejs",{data:result});
    })
})


//게시글 수정화면 페이지 요청
app.get("/board/update/:num",(req,res)=>{
    db.collection("product").findOne({num:Number(req.params.num)},(err,result)=>{

        res.render("brd_update.ejs",{data:result});
    })
})


//게시글 데이터베이스 수정
app.post("/dbupdate",upload.single("thumbnail"),(req,res)=>{
    //첨부파일 첨부하지 않았을 때 경우는 아직 구현 안함!
    db.collection("product").updateOne({num:Number(req.body.num)},{$set:{title:req.body.title,author:req.body.author,attachfile:req.file.filename}},(err,result)=>{
        res.redirect(`/board/detail/${req.body.num}`) 
    })
})

//게시글 데이터베이스 수정(첨부파일 여러개 작업시 사용)
app.post("/dbupdate2",upload.array("thumbnail"),(req,res)=>{
    
    //첨부 파일을 변경한 경우 ->  배열안에 데이터가 있다는 얘기
    //첨부 파일을 변경하지 않은 경우 -> 빈 배열
    // console.log(req.files);
    // console.log(req.files.length);
    let changeFiles = []; // 빈배열
    let changeDatas = {}; // 빈객체
    
    if(req.files.length > 0){
        //첨부한 파일들의 파일명만 뽑아서 배열에 담고 db에 저장
        for(let i=0; i<req.files.length; i++){
            changeFiles[i] = req.files[i].filename
        }
        //db 수정처리할 데이터 정리(객체로)
        changeDatas = {
             title:req.body.title,
             author:req.body.author,
             attachfile:changeFiles
        }
    }
    else{
        //첨부파일 수정하면 안되
        changeDatas = {
            title:req.body.title,
            author:req.body.author
        }
    }

    db.collection("product").updateOne({num:Number(req.body.num)},{$set:changeDatas},(err,result)=>{
        res.redirect(`/board/detail/${req.body.num}`) 
    })
})




//여러개 동시첨부
app.post("/dbupload2",upload.array("thumbnail"),(req,res)=>{
    
    // console.log(req.files[0].filename) 
    // console.log(req.files[1].filename) 
    // console.log(req.files[2].filename) 

    //배열을 하나 생성
    let fileNames = [];
    for(let i=0; i<req.files.length; i++){
        fileNames[i] = req.files[i].filename 
        //첨부한 파일들의 파일명만 뽑아서 배열에 옮겨담음
    }
    
    db.collection("count").findOne({name:"상품갯수"},(err,countResult)=>{
        db.collection("product").insertOne({
            num:countResult.prdCount,
            title:req.body.title,
            author:req.body.author,
            attachfile:fileNames,
        },(err,result)=>{
            db.collection("count").updateOne({name:"상품갯수"},{$inc:{prdCount:1}},(err,result)=>{
                res.redirect(`/board/detail/${countResult.prdCount}`)
            })
        })
    })
})









