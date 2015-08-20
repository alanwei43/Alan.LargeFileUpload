using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace Alan.LargeFileUpload
{
    /// <summary>
    /// Summary description for FileUpload
    /// </summary>
    public class FileUpload : IHttpHandler
    {

        public void ProcessRequest(HttpContext context)
        {
            var req = context.Request;
            var rep = context.Response;

            req.ContentType = "application/json";
            var fileName = req["fileName"];

            if (String.IsNullOrWhiteSpace(fileName))
            {
                fileName = Guid.NewGuid().ToString();
            }
            using (System.IO.BinaryReader reader = new System.IO.BinaryReader(req.InputStream))
            {
                System.IO.MemoryStream ms = new System.IO.MemoryStream();
                int bte;
                while ((bte = reader.Read()) != -1)
                {
                    ms.WriteByte((byte)bte);
                }
                var arrayBytes = ms.ToArray();
                var base64 = System.Text.Encoding.UTF8.GetString(arrayBytes);
                var data = Convert.FromBase64String(base64);

                var fileFullPath = System.Web.Hosting.HostingEnvironment.MapPath("~/Static/" + fileName);

                this.AppedOrCreate(fileFullPath, data);
            }
            rep.Write("{\"FileName\":\"" + fileName + "\"}");

        }

        public bool IsReusable
        {
            get
            {
                return false;
            }
        }


        /// <summary>
        /// 如果文件存在就附加数据, 如果不存在就新建文件
        /// </summary>
        /// <param name="filePath">文件绝对路径</param>
        /// <param name="data">数据</param>
        private void AppedOrCreate(string filePath, byte[] data)
        {
            if (!System.IO.File.Exists(filePath))
            {
                var fs = System.IO.File.Create(filePath);
                fs.Close();
                fs.Dispose();
            }

            using (System.IO.FileStream fs = new System.IO.FileStream(filePath, System.IO.FileMode.Append, System.IO.FileAccess.Write, System.IO.FileShare.Write))
            {
                fs.Write(data, 0, data.Length);
            }
        }

    }
}