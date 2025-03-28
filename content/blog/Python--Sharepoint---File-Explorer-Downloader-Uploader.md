---
title: 'Python & Sharepoint - File Explorer, Downloader, Uploader'
date: 2024-10-20T04:00:00.000Z
featureImage: /Python.png
---

# Streamlining SharePoint with 'sharepoint\_utility' 

I'm excited to share a Python package I developed called sharepoint\_utility. This toolkit simplifies common tasks when interacting with SharePoint, making it easier to automate file management, data extraction, and more.

The Challenge

SharePoint is a powerful platform, but programmatically interacting with it can sometimes be complex. Authentication, navigating folder structures, and handling file variations require robust and reliable code. I created sharepoint\_utilityto address these challenges and provide a more streamlined developer experience.

Key Features

The sharepoint\_utilitypackage is designed with modularity and reusability in mind. Here's a breakdown of its core capabilities:

* Authentication:
* get\_client\_context: Establishes a secure connection to SharePoint using provided credentials. This is the foundation for all other operations.
* def get\_client\_context(base\_url, site\_path, username, password):
      base\_url = base\_url.rstrip("/")
      site\_url = base\_url + site\_path
      ctx\_auth = AuthenticationContext(site\_url)
      ctx\_auth.acquire\_token\_for\_user(username=username, password=password)
      return ClientContext(site\_url, ctx\_auth)
* File and Folder Management:
* \_ensure\_subfolder\_structure: Creates nested folder structures within SharePoint if they don't exist, ensuring files are uploaded to the correct location.
* def \_ensure\_subfolder\_structure(ctx, documents\_lib, root\_subfolder):
      ctx.load(documents\_lib, \["RootFolder"])
      ctx.execute\_query()
      root\_folder\_obj = documents\_lib.get\_property("RootFolder")
      ctx.load(root\_folder\_obj, \["ServerRelativeUrl"])
      ctx.execute\_query()
      library\_root\_url = root\_folder\_obj.get\_property('serverRelativeUrl').rstrip("/")
      desired\_path = root\_subfolder.strip("/")
      if not desired\_path:
          return root\_folder\_obj
      parts = \[p for p in desired\_path.split("/") if p]
      existing\_folder = None
      found\_index = 0
      for i in range(len(parts), -1, -1):
          partial\_path = "/".join(parts\[:i])
          test\_url = library\_root\_url
          if partial\_path:
              test\_url = test\_url + "/" + partial\_path
          try:
              candidate\_folder = get\_folder\_by\_server\_relative\_url(ctx, test\_url)
              existing\_folder = candidate\_folder
              found\_index = i
              break
          except Exception:
              pass
      if existing\_folder is None:
          existing\_folder = root\_folder\_obj
          found\_index = 0
      current\_folder = existing\_folder
      for j in range(found\_index, len(parts)):
          new\_subfolder = current\_folder.folders.add(parts\[j])
          ctx.execute\_query()
          current\_folder = new\_subfolder
      return current\_folder
* upload\_file\_to\_sharepoint: Handles uploading files to SharePoint from various sources, including DataFrames.
* def upload\_file\_to\_sharepoint(
      base\_url=None,
      site\_path=None,
      username=None,
      password=None,
      library\_title="Documents",
      root\_subfolder="General",
      local\_file\_path=None,
      file\_bytes=None,
      sharepoint\_file\_name=None,
      df=None,
      dfs\_dict\_list=None,
      ensure\_subfolder=False  
  ):
      try:
          ctx = get\_client\_context(base\_url, site\_path, username, password)
      except Exception as exc:
          return {
              "uploaded": False,
              "server\_relative\_url": None,
              "error": f"Failed to get ClientContext: {exc}"
          }
      documents\_lib = get\_documents\_library(ctx, library\_title)
      if not documents\_lib:
          return {
              "uploaded": False,
              "server\_relative\_url": None,
              "error": f"Could not find document library '{library\_title}'."
          }
      ctx.load(documents\_lib, \["RootFolder"])
      ctx.execute\_query()
      root\_folder\_obj = documents\_lib.get\_property("RootFolder")
      ctx.load(root\_folder\_obj, \["ServerRelativeUrl"])
      ctx.execute\_query()
      library\_root\_url = root\_folder\_obj.get\_property("ServerRelativeUrl")
      if root\_subfolder:
          normalized\_subfolder = root\_subfolder.strip("/")
          folder\_url = library\_root\_url.rstrip("/") + "/" + normalized\_subfolder
      else:
          folder\_url = library\_root\_url
      if ensure\_subfolder and root\_subfolder:
          try:
              target\_folder = \_ensure\_subfolder\_structure(ctx, documents\_lib, normalized\_subfolder)
              folder\_url = target\_folder.serverRelativeUrl
          except Exception as exc:
              return {
                  "uploaded": False,
                  "server\_relative\_url": None,
                  "error": f"Could not ensure subfolder path '{root\_subfolder}'. Error: {exc}"
              }
      else:
          try:
              target\_folder = get\_folder\_by\_server\_relative\_url(ctx, folder\_url)
          except Exception as exc:
              return {
                  "uploaded": False,
                  "server\_relative\_url": None,
                  "error": f"Could not locate folder path '{folder\_url}'. Error: {exc}"
              }
      final\_bytes = None
      if dfs\_dict\_list is not None:
          if sharepoint\_file\_name is None:
              sharepoint\_file\_name = "multiple\_dfs.xlsx"
          bytes\_buffer = BytesIO()
          with pd.ExcelWriter(bytes\_buffer, engine='openpyxl') as writer:
              for entry in dfs\_dict\_list:
                  tab\_name = entry\["tab\_name"]
                  dataframe = entry\["dataframe"]
                  dataframe.to\_excel(writer, sheet\_name=tab\_name, index=False)
          final\_bytes = bytes\_buffer.getvalue()
      elif df is not None:
          if sharepoint\_file\_name is None:
              sharepoint\_file\_name = "dataframe\_upload.csv"
          str\_buffer = StringIO()
          df.to\_csv(str\_buffer, index=False)
          final\_bytes = str\_buffer.getvalue().encode("utf-8")
      elif local\_file\_path:
          if sharepoint\_file\_name is None:
              sharepoint\_file\_name = os.path.basename(local\_file\_path)
          try:
              with open(local\_file\_path, "rb") as f:
                  final\_bytes = f.read()
          except Exception as exc:
              return {
                  "uploaded": False,
                  "server\_relative\_url": None,
                  "error": f"Could not read local file '{local\_file\_path}': {exc}"
              }
      elif file\_bytes is not None:
          if sharepoint\_file\_name is None:
              return {
                  "uploaded": False,
                  "server\_relative\_url": None,
                  "error": "Must provide sharepoint\_file\_name if only passing file\_bytes."
              }
          final\_bytes = file\_bytes
      else:
          return {
              "uploaded": False,
              "server\_relative\_url": None,
              "error": "No data provided (df, dfs\_dict\_list, local\_file\_path, or file\_bytes)."
          }
      try:
          uploaded\_file = target\_folder.upload\_file(sharepoint\_file\_name, final\_bytes).execute\_query()
          return {
              "uploaded": True,
              "server\_relative\_url": uploaded\_file.serverRelativeUrl,
              "error": None
          }
      except Exception as exc:
          return {
              "uploaded": False,
              "server\_relative\_url": None,
              "error": f"Failed to upload file '{sharepoint\_file\_name}': {exc}"
          }
* Data Extraction and Exploration
* build\_file\_tree\_df: Generates a Pandas DataFrame representing the file and folder hierarchy.
* def build\_file\_tree\_df(folder, ctx, current\_path=""):
      records = \[]
      folder\_name = folder.properties.get("Name", "")
      this\_path = os.path.join(current\_path, folder\_name)
      files = folder.files
      ctx.load(files)
      ctx.execute\_query()
      for f in files:
          file\_name = f.properties.get("Name", "")
          file\_url = f.properties.get("ServerRelativeUrl", "")
          records.append({
              "Directory": this\_path,
              "FileName": file\_name,
              "FileUrl": file\_url
          })
      subfolders = folder.folders
      ctx.load(subfolders)
      ctx.execute\_query()
      for sf in subfolders:
          sub\_df = build\_file\_tree\_df(sf, ctx, this\_path)
          records.extend(sub\_df.to\_dict("records"))
      return pd.DataFrame(records)
* load\_tabular\_file: Downloads and parses tabular data (Excel, CSV, TSV) into Pandas DataFrames. It also extracts color information from Excel files.
* def load\_tabular\_file(ctx, file\_url, sheet\_name):
      file\_result = File.open\_binary(ctx, file\_url)
      file\_bytes = file\_result.content
      \_, ext = os.path.splitext(file\_url.lower())
      if ext in \[".xlsx", ".xls"]:
          return \_load\_excel\_file(file\_bytes, sheet\_name)
      elif ext in \[".csv", ".tsv"]:
          return \_load\_csv\_file(file\_bytes, ext)
      else:
          print(f"Not a recognized tabular file type: {file\_url}")
          return None

  def \_load\_excel\_file(file\_bytes, sheet\_name=None):
      with BytesIO(file\_bytes) as bio:
          xls = pd.ExcelFile(bio)
          if sheet\_name is None:
              print("Found sheet names:", xls.sheet\_names)
              print("Provide a sheet\_name to load a specific worksheet.")
          else:
              df = pd.read\_excel(bio, sheet\_name=sheet\_name).clean\_names()
      bio2 = BytesIO(file\_bytes)
      with BytesIO(file\_bytes) as bio2:
          wb = load\_workbook(bio2, data\_only=True)
          if sheet\_name in wb.sheetnames:
              ws = wb\[sheet\_name]
              theme\_color\_map = {
                  0: "FFFFFF",
                  1: "000000",
                  2: "EEECE1",
                  3: "1F497D",
                  4: "4F81BD",
                  5: "C0504D",
                  6: "9BBB59",
                  7: "8064A2",
              }
              color\_dict = {}
              for row in ws.iter\_rows():
                  for cell in row:
                      fill\_color = cell.fill.fgColor if cell.fill else None
                      if fill\_color:
                          color\_hex = None
                          if fill\_color.type == "rgb" and fill\_color.rgb:
                              color\_hex = fill\_color.rgb
                          elif fill\_color.type == "theme" and fill\_color.theme is not None:
                              color\_hex = theme\_color\_map.get(fill\_color.theme, None)
                          if color\_hex:
                              r\_idx = cell.row - 1
                              c\_idx = cell.column - 1
                              color\_dict\[(r\_idx, c\_idx)] = color\_hex
              df.attrs\["color\_dict"] = color\_dict
          else:
              df.attrs\["color\_dict"] = None
      return df

  def \_load\_csv\_file(file\_bytes, ext):
      sep = "," if ext == ".csv" else "\t"
      with BytesIO(file\_bytes) as bio:
          df = pd.read\_csv(bio, sep=sep).clean\_names()
      return df
* connect\_and\_explore\_sharepoint\_cascading: A high-level function that combines connection, navigation, file searching, and data loading.def connect\_and\_explore\_sharepoint\_cascading(
      base\_url=None,
      site\_path=None,
      username=None,
      password=None,
      library\_title="Documents",
      root\_subfolder="General",
      search\_filename=None,
      sheet\_name=None,
      force\_full\_recursive=False
  ):
      ctx = get\_client\_context(base\_url, site\_path, username, password)
      documents\_lib = get\_documents\_library(ctx, library\_title)
      if not documents\_lib:
          print(f"Could not find '{library\_title}' library.")
          return {
              "ctx": ctx,
              "library\_found": False,
              "subfolder\_found": False,
              "file\_found": False,
              "full\_df": None,
              "df\_tabular": None,
              "df\_tabular\_color\_dict": None
          }
      ctx.load(documents\_lib, \["RootFolder"])
      ctx.execute\_query()
      root\_folder\_obj = documents\_lib.get\_property("RootFolder")
      ctx.load(root\_folder\_obj, \["ServerRelativeUrl"])
      ctx.execute\_query()
      library\_root\_url = root\_folder\_obj.get\_property("ServerRelativeUrl")
      if root\_subfolder:
          normalized\_subfolder = root\_subfolder.strip("/")
          full\_path = library\_root\_url.rstrip("/") + "/" + normalized\_subfolder
          try:
              target\_folder = get\_folder\_by\_server\_relative\_url(ctx, full\_path)
          except Exception as e:
              print(f"Could not locate folder path '{full\_path}' in '{library\_title}'. Error:")
              print(e)
              return {
                  "ctx": ctx,
                  "library\_found": True,
                  "subfolder\_found": False,
                  "file\_found": False,
                  "full\_df": None,
                  "df\_tabular": None,
                  "df\_tabular\_color\_dict": None
              }
      else:
          print(f"No root\_subfolder specified; using the library root: '{library\_title}'")
          target\_folder = get\_folder\_by\_server\_relative\_url(ctx, library\_root\_url)
      file\_found = False
      df\_tabular = None
      full\_df = None

      def load\_or\_download\_file(context, file\_url, file\_name, sheet):
          tabular\_exts = {'.xls', '.xlsx', '.csv'}
          \_, ext = os.path.splitext(file\_name.lower())
          if ext in tabular\_exts:
              df\_local = load\_tabular\_file(context, file\_url, sheet)
              return df\_local, False
          else:
              downloads\_folder = Path.home() / "Downloads"
              downloads\_folder.mkdir(parents=True, exist\_ok=True)
              local\_path = downloads\_folder / file\_name
              print(f"Downloading '{file\_name}' to '{local\_path}' ...")
              with open(local\_path, 'wb') as local\_file:
                  file = context.web.get\_file\_by\_server\_relative\_url(file\_url)
                  file.download(local\_file)
                  context.execute\_query()
              return None, True
      if search\_filename and not force\_full\_recursive:
          target\_folder\_files = target\_folder.files
          ctx.load(target\_folder\_files)
          ctx.execute\_query()
          matched\_file\_url = None
          matched\_file\_name = None
          for f in target\_folder\_files:
              sp\_file\_name = f.properties.get("Name", "")
              if search\_filename.lower() in sp\_file\_name.lower():
                  matched\_file\_url = f.properties.get("ServerRelativeUrl")
                  matched\_file\_name = sp\_file\_name
                  break
          if matched\_file\_url:
              file\_found = True
              df\_tabular\_local, was\_downloaded = load\_or\_download\_file(
                  ctx, matched\_file\_url, matched\_file\_name, sheet\_name
              )
              df\_tabular = df\_tabular\_local
              color\_dict\_local = df\_tabular.attrs.get("color\_dict") if df\_tabular is not None else None
              return {
                  "ctx": ctx,
                  "library\_found": True,
                  "subfolder\_found": True,
                  "file\_found": file\_found,
                  "was\_downloaded": was\_downloaded,
                  "full\_df": None,
                  "df\_tabular": df\_tabular,
                  "df\_tabular\_color\_dict": color\_dict\_local
              }
          else:
              print(f"'{search\_filename}' not found at immediate level of '{root\_subfolder or library\_title}'.")
              print("Attempting deeper search...")
              full\_df = build\_file\_tree\_df(target\_folder, ctx)
              df\_match = full\_df\[full\_df\["FileName"].str.lower().str.contains(search\_filename.lower())]
              if not df\_match.empty:
                  file\_found = True
                  matched\_file\_url = df\_match.iloc\[0]\["FileUrl"]
                  matched\_file\_name = df\_match.iloc\[0]\["FileName"]
                  df\_tabular\_local, was\_downloaded = load\_or\_download\_file(
                      ctx, matched\_file\_url, matched\_file\_name, sheet\_name
                  )
                  df\_tabular = df\_tabular\_local
              else:
                  print(f"Could not find '{search\_filename}' in deeper subfolders of '{root\_subfolder or library\_title}'.")
              color\_dict\_local = df\_tabular.attrs.get("color\_dict") if df\_tabular is not None else None
              return {
                  "ctx": ctx,
                  "library\_found": True,
                  "subfolder\_found": True,
                  "file\_found": file\_found,
                  "was\_downloaded": (file\_found and df\_tabular is None),
                  "full\_df": full\_df,
                  "df\_tabular": df\_tabular,
                  "df\_tabular\_color\_dict": color\_dict\_local
              }
      print(f"Building file tree under '{root\_subfolder or library\_title}'...")
      full\_df = build\_file\_tree\_df(target\_folder, ctx)
      color\_dict\_local = None
      if search\_filename:
          df\_match = full\_df\[full\_df\["FileName"].str.lower().str.contains(search\_filename.lower())]
          if not df\_match.empty:
              file\_found = True
              matched\_file\_url = df\_match.iloc\[0]\["FileUrl"]
              matched\_file\_name = df\_match.iloc\[0]\["FileName"]
              df\_tabular\_local, was\_downloaded = load\_or\_download\_file(
                  ctx, matched\_file\_url, matched\_file\_name, sheet\_name
              )
              df\_tabular = df\_tabular\_local
              color\_dict\_local = df\_tabular.attrs.get("color\_dict") if df\_tabular is not None else None
          else:
              print(f"'{search\_filename}' not found in '{root\_subfolder or library\_title}' after full recursion.")
              was\_downloaded = False
      else:
          was\_downloaded = False
      return {
          "ctx": ctx,
          "library\_found": True,
          "subfolder\_found": bool(root\_subfolder),
          "file\_found": file\_found,
          "was\_downloaded": (file\_found and df\_tabular is None),
          "full\_df": full\_df,
          "df\_tabular": df\_tabular,
          "df\_tabular\_color\_dict": color\_dict\_local
      }

Example Use Cases

Here are a few examples of how sharepoint\_utilitycan be applied:

* Automated Data Processing: Imagine a workflow that automatically downloads data from a SharePoint site, processes it with Pandas, and then uploads the results back to SharePoint. This package makes each of those steps easier.
* Report Generation: You could use it to pull data from various Excel files in SharePoint, combine it into a master report, and then upload the final report.
* File Organization: Automate the creation of folder structures and the uploading of files into specific locations, keeping your SharePoint libraries tidy.
* Data Migration: The package can assist in migrating data between SharePoint sites or from other systems into SharePoint.

Why This Project Matters

This project demonstrates my ability to:

* Develop reusable and well-structured Python packages.
* Work with complex APIs and authentication mechanisms.
* Solve practical problems by automating tedious tasks.
* Write code that is both functional and easy to use.

I'm proud of how sharepoint\_utilitystreamlines SharePoint interactions. It's a valuable tool that I believe showcases my skills as a developer.
