jQuery(function($){


    /*
    * App logic 
    */

    var App = {
        bookmarks:[
        [2013,3,27],
        [2013,3,29],
        [2013,4,3],
        [2013,4,4],
        [2013,4,8],
        [2013,4,9],
        [2013,4,11],
        [2013,4,15],
        [2013,4,16],
        [2013,4,17],
        [2013,4,18],
        [2013,4,19],
        [2013,4,20],
        [2013,4,21],
        [2013,4,26]
        ],
        fitbit_id:330685, //327992,
        zeo_id:325683,
        heart_id:315518,
        iphone_noise_id:291225,
        targetNight:null,
        init:function(){
            var self = this;
            console.log("app.init");

            this.doDateStuff();
            this.makeBookmarks();
            // return;
            if( CS.hasSession() ) this.loadData();

            /* attach a submit handler to the form */
            $("#login").submit(function(event) {
                event.preventDefault();
                CS.login( $("#username").val(), $("#password").val(), $.proxy(self.loadData,self)); 
            });

            

            // D3Test.init();
        },
        makeBookmarks:function(){
            var self = this;
            var str="";
            this.bookmarks.forEach(function(a,i){
                str += "<button id=\"b"+i+"\">"+a.join("/")+"</button>";
            });
            $("#bookmarks").html(str);

            this.bookmarks.forEach(function(a,i){
                $("#bookmarks #b"+i).click(function(){
                    self.gotoURL.apply(self,a);
                });
            });
        },
        gotoURL:function(y,m,d){
           window.location.href = window.location.pathname 
                + "?y="+y + "&m="+m + "&d="+d;

        },
        doDateStuff:function(){
            targetNight = new Date();// = new Date(Date.now());
            var y = this.getURLParameter('y');
            var m = this.getURLParameter('m') - 1;
            var d = this.getURLParameter('d');
            
            if( y && m && d)
                targetNight = new Date(Date.UTC(y,m,d));
            else{
                targetNight.setUTCHours(0);
                targetNight.setUTCMinutes(0);
                targetNight.setUTCSeconds(0);
            }

            $("#title").html("Data for "+targetNight.toDateString());

            //prev / next buttons
            $("#prev").click(function(){
                var d = new Date( +targetNight - 24 * 3600 * 1000);
                this.gotoURL( d.getFullYear(),d.getMonth(),d.getDate());
            });

            $("#next").click(function(){
                var d = new Date( +targetNight + 24 * 3600 * 1000);
                this.gotoURL( d.getFullYear(),d.getMonth(),d.getDate());
            });


        },
        loadData:function(){
            
            $("#login-form").hide();

            var self = this;
            
          
            //var targetNight = new Date(Date.UTC(2013,3,1));
            var startDate = new Date( +targetNight - 4 * 3600 * 1000);
            var endDate = new Date( +targetNight + 11 * 3600 * 1000);
            d3Test.init(startDate,endDate);

            //CS.getSensorData(this.sensor_id,$.proxy(App.parseData,App));
            CS.getSensorDataRange(this.fitbit_id,startDate,endDate, 
                $.proxy(function(data){ 
                    //self.graphs.push( new D3TestGraph("fitbit",data,"#f00"));
                    d3Test.addGraph(3,"fitbit",data,"#f00",false
                        ,[0,3]
                        ,[1,2,3],
                        function(d){
                            var labels = ["asleep","awake","active"]
                            if( d<1 || d>3)return;
                            return labels[~~d - 1];
                        }
                        );
                },this));

            CS.getSensorDataRange(this.zeo_id,startDate,endDate, 
                $.proxy(function(data){ 
                        //self.graphs.push( new D3TestGraph("zeo",data,"#0f0"));
                    d3Test.addGraph(2,"zeo",data,"#0f0",false
                        ,[0,4]
                        ,[0,1,2,3,4]
                        ,function(d){
                            var labels= ["","wake","REM","light","deep"];      
                            if( d < 0 || d > labels.length ) return;
                            return labels[d];
                        });
                },this));

            CS.getSensorDataRange( this.heart_id,startDate,endDate,
                $.proxy(function(data){
                    d3Test.addGraph(1,"heart",data,"#00f",true
                    ,[40,140]
                    ,[40,60,80,100,120,140]);
                },this));
            CS.getSensorDataRange( this.iphone_noise_id,startDate,endDate,
                $.proxy(function(data){
                    d3Test.addGraph(0,"noise",data,"#ff0",true
                    ,[-70,-30]
                    ,[-70,-30]
                    ,function(d){
                        return (d==-70)?"quiet":"loud";
                    });
                },this));
        },
        getURLParameter:function(name) {
            return decodeURIComponent((
                new RegExp('[?|&]' + name + '=' + '([^&;]+?)(&|#|;|$)')
                    .exec(location.search)||[,""]
            )[1].replace(/\+/g, '%20'))||null;

        }
    };


    /*
    * CS helper
    */
    var CS = (function(){
        var session_id = "bla"
        , url = 'https://api.sense-os.nl/';

        var paramString = function(a){
            var str = [];
            for(var p in a) {
                str.push(encodeURIComponent(p) + "=" + encodeURIComponent(a[p]));
            }
            str = "?"+str.join("&");
            console.log(str);
            return str;
        }
        
        var getSensorData = function( id, params, callback ){

            $.ajax({
                url:url+'sensors/'+id+'/data'+paramString(params),
                dataType:"json",
                beforeSend: function (request)
                {
                    request.setRequestHeader("X-SESSION_ID",session_id );
                    request.setRequestHeader("Accept","*");
                },
                type:"GET",
                success: function(r){
                    console.log("ajax result:");
                    console.log(r);
                    callback(r.data); 
                }
            })
        };
        var getSensorDataRange = function( id, start, end, callback ){
            var allData = [];
            var sd = (+start)/1000
            , ed = (+end)/1000;
            
            var dataHandler = function(data){
                allData.push.apply(allData,data);
                if(data.length == 1000)
                    getMore( id, data[data.length-1].date,ed);
                else
                    callback(allData);
            }
            var getMore = function(id, start, end){
                getSensorData.call(this, id, {
                    start_date:start,
                    end_date:end,
                    per_page:1000},
                    $.proxy( dataHandler,this));

            }
            
            getMore( id, sd, ed);
        };


        return {
            hasSession:function(){
                
                session_id = $(document).sessionStorage("session_id");
                console.log("sid:"+session_id);
                return !!session_id;
            },
            login:function(name,pass,callback){
                $.ajax({
                    url:url+'login.json',
                    type:"POST",
                    data: JSON.stringify({
                        username:name,
                        password:$.md5(pass)
                    }),
                    contentType:"application/json; charset=utf-8",
                    dataType:"json",
                    success: function(response){
                        $(document).sessionStorage("session_id", response.session_id);
                        session_id = response.session_id
                        callback();
                    }
                });
            },
            //getSensorDataRange:getSensorDataRange
            getSensorDataRange:function(id,start,end,callback){
                 getSensorDataRange.call(this,id,start,end,callback);

            }

        };
    
    })();
  

    var d3Test = (function(){
        var graphs = []
        , maxGraphs = 4
        , width = 960
        , margin = 40
        , leftMargin = 80
        , graphHeight = 100
        , brushHeight = 50
        , xGraph = d3.time.scale.utc().range([0,width])
        , xBrush = d3.time.scale.utc().range([0,width])
        //, yGraph = d3.scale.linear().range([graphHeight,0])
        , yBrush = d3.scale.linear().range([brushHeight,0])
        , xAxisGraph = d3.svg.axis().scale(xGraph).orient("bottom")
        , xAxisBrush = d3.svg.axis().scale(xBrush).orient("bottom")
        //, yAxis = d3.svg.axis().scale(yGraph).orient("left")
        , brush
        , timeView;

        //xAxisGraph.ticks(d3.time.minutes,5);
        //xAxisBrush.ticks(d3.time.hours,1);
        
        xAxisGraph.tickFormat(d3.time.format("%H:%M"));
        xAxisBrush.tickFormat(d3.time.format("%H:%M"));

        var svg = d3.select("body").append("svg")
        .attr("width", width + margin + leftMargin)
        .attr("height", maxGraphs*(graphHeight+margin) + brushHeight + 2 * margin);
        
        svg.append("defs").append("clipPath")
        .attr("id", "clip")
        .append("rect")
        .attr("width", width)
        .attr("height", graphHeight);


        // function createTimeAxis(){
        //     timeView = svg.append("g")
        //     .attr("transform","translate("+margin+",10)");
        //     
        //     timeView.append("g")
        //     .attr("class","x axis")
        //     .call(xAxisGraph);


        // }
        function createBrush(){
            brush = d3.svg.brush()
            .x(xBrush)
            .on("brush", $.proxy(brushed,this));

            var brushOff = (margin+graphHeight)*maxGraphs + margin;

            var brushView = svg.append("g")
            .attr("transform","translate("+leftMargin+","+brushOff+")");

            brushView.append("g")
            .attr("class","x axis")
            .attr("transform","translate(0,"+brushHeight+")")
            .call(xAxisBrush);

            brushView.append("g")
            .attr("class","x brush")
            .call(brush)
            .selectAll("rect")
            .attr("y",-6)
            .attr("height",brushHeight+7);


        }

        function addGraph(index,title,data,scolor,interpolate,range,values,formatFn){
            console.log("createGraph:"+title);

            // var xGraph = d3.time.scale().range([0,width])
            // var yGraph = d3.scale.linear().range([graphHeight,0])
            // var xAxisGraph = d3.svg.axis().scale(xGraph).orient("bottom");
            // var yAxisGraph = d3.svg.axis().scale(yGraph).orient("left");
            data.forEach(function(d){
                d.date = new Date(d.date*1000);
                d.value = +d.value;
            });
            
            var yGraph = d3.scale.linear().range([graphHeight,0]);
            var yAxis = d3.svg.axis().scale(yGraph).orient("left");
            if( values ){
                yAxis.tickValues(values);
                console.log("custom ticks");
            }else console.log("default ticks");
            
            if( formatFn ){
                console.log("custom fn");
                yAxis.tickFormat(formatFn);
                
            }
            
            if( range ){
                console.log("custom domain");
                yGraph.domain(range);

            }
            else{
                console.log('default domain');
                yGraph.domain([ 
                    d3.min(data,function(d){return d.value;})-1,
                    d3.max(data,function(d){return d.value;})+1
                ]);
            }

            var yoff = margin + (margin + graphHeight) * index;

            var view = svg.append("g")
            .attr("transform","translate("+leftMargin+","+ yoff +")");

          
            // xGraph.domain([startDate,endDate]);
            //xGraph.domain(d3.extent(data,function(d){return d.date;}));
            //yGraph.domain([-1,5]);
            var area = d3.svg.area()
            .x(function(d) { return xGraph(d.date); })
            .y0(graphHeight)
            .y1(function(d) { return yGraph(d.value); });
            
            if( interpolate )
                area.interpolate("basis");

            var line = d3.svg.line()
            //.interpolate("basis")
            .x(function(d) { return xGraph(d.date); })
            .y(function(d) { return yGraph(d.value);});

            // view.append("path")
            // .datum(data)
            // .attr("class","line")
            // .attr("d",line);

            view.append("path")
            .datum(data)
            .attr("class","area")
            .attr("d",area)
            .attr("clip-path","url(#clip)");

             view.append("g")
             .attr("class","x axis")
             .attr("transform","translate(0,"+graphHeight+")")
             .call(xAxisGraph);
            
            view.append("g")
                .attr("class", "y axis")
                //.style("fill", scolor)
                .call(yAxis)
                .append("text")
                .attr("transform", "rotate(-90)")
                .attr("y", 6)
                .attr("dy", "-4.71em")
                .style("text-anchor", "end")
                .text(title);

            graphs[index] = {
                title:title,
                line:line,
                area:area,
                view:view
            };
        }

        function brushed(){
            console.log("brush");
            xGraph.domain(brush.empty() ? xBrush.domain() : brush.extent());
            //timeView.select(".x.axis").call(xAxisGraph);

            //svg.select("path").attr("d",line)
            graphs.forEach(function(o){
                // o.view.select("path").attr("d",o.line);
                o.view.select("path").attr("d",o.area);
                o.view.select(".x.axis").call(xAxisGraph);
            });

        }

        return {
            init:function(startDate,endDate){
                console.log("init");
                xGraph.domain([startDate,endDate]);
                xBrush.domain(xGraph.domain());
                // yGraph.domain([-1,5]);
                // yBrush.domain(yGraph.domain());
                createBrush();
                //createTimeAxis();
            },
           addGraph:addGraph
             // addGraph:function(index,title,data,scolor,range,values,formatFn){
             //     console.log("addGraph");
             //    createGraph.apply(this,arguments);
             //     //graphs.push(createGraph.apply(this, arguments));
             // }
        };
    }());
    console.log("init?");
    App.init();
});


//old code
function neverDo(){
    /*
    * D3 test
    */

    function D3TestGraph (title, data, scolor){
        self = this;
        this.margin = {top: 10, right: 10, bottom: 70, left: 40};
        this.margin2 = {top: 160, right: 10, bottom: 20, left: 40};
        this.width = 960 - this.margin.left - this.margin.right,
        this.height = 200 - this.margin.top - this.margin.bottom;
        this.height2 = 200 - this.margin2.top - this.margin2.bottom;

        this.x = d3.time.scale.utc().range([0, this.width]);
        this.x2 = d3.time.scale.utc().range([0, this.width]);
        this.y = d3.scale.linear().range([this.height, 0]);
        this.y2 = d3.scale.linear().range([this.height2, 0]);


        this.xAxis = d3.svg.axis().scale(this.x).orient("bottom");
        this.xAxis2 = d3.svg.axis().scale(this.x2).orient("bottom");
        this.yAxis = d3.svg.axis().scale(this.y).orient("left"); 

        this.brush = d3.svg.brush()
        .x(this.x2)
        .on("brush", $.proxy(this.brushed,this));

        this.line = d3.svg.line()
        .x(function(d) { return self.x(d.date); })
        .y(function(d) { return self.y(d.value); });

        this.line2 = d3.svg.line()
        .x(function(d) { return self.x2(d.date); })
        .y(function(d) { return self.y2(d.value); });

        this.svg = d3.select("body").append("svg")
        .attr("width", this.width + this.margin.left + this.margin.right)
        .attr("height", this.height + this.margin.top + this.margin.bottom)

        this.svg.append("defs").append("clipPath")
        .attr("id", "clip")
        .append("rect")
        .attr("width", this.width)
        .attr("height", this.height);

        this.focus = this.svg.append("g")
        .attr("transform", "translate(" + this.margin.left + "," + this.margin.top + ")");
        this.context = this.svg.append("g")
        .attr("transform", "translate(" +this.margin2.left + "," +this.margin2.top +")");


        data.forEach(function(d) {
            d.date = new Date(d.date*1000);
            d.value = +d.value;
        });

        this.x.domain(d3.extent(data, function(d) { return d.date; }));
        this.x2.domain(this.x.domain());
        this.y.domain([
            d3.min(data,function(d){return d.value;})-1,
            d3.max(data,function(d){return d.value;})+1
        ]);
        this.y2.domain(this.y.domain());


        this.focus.append("path")
        .datum(data)
        .attr("class", "line")
        .attr("d", this.line)
        .attr("clip-path","url(#clip)")
        .style("stroke", scolor);

        this.focus.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + this.height + ")")
        .call(this.xAxis);

        this.focus.append("g")
        .attr("class", "y axis")
        .style("fill", scolor)
        .call(this.yAxis)
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 6)
        .attr("dy", "0.71em")
        .style("text-anchor", "end")
        .text(title);

        this.context.append("path")
        .datum(data)
        .attr("d",this.line2)

        this.context.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0,"+this.height2+")")
        .call(this.xAxis2);

        this.context.append("g")
        .attr("class","x brush")
        .call(this.brush)
        .selectAll("rect")
        .attr("y",-6)
        .attr("height",this.height2+7);

        this.test = "haha";
    };
    D3TestGraph.prototype.brushed = function() {
        console.log("brushed");
        console.log(this.test);
        this.x.domain(this.brush.empty() ? this.x2.domain() : this.brush.extent());
        this.focus.select("path").attr("d", this.line);
        this.focus.select(".x.axis").call(this.xAxis);
    };


    App.init();
}

